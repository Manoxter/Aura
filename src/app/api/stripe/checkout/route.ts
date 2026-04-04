import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getStripe, PRICE_IDS, getOrCreateStripeCustomer } from '@/lib/stripe'

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req)
        if (auth.error) return auth.error

        const body = await req.json()
        const planId = body.planId as string

        if (!planId || !['PRO', 'ELITE'].includes(planId)) {
            return NextResponse.json(
                { error: 'planId invalido. Use "PRO" ou "ELITE".' },
                { status: 400 }
            )
        }

        const priceId = PRICE_IDS[planId as 'PRO' | 'ELITE']
        if (!priceId) {
            return NextResponse.json(
                { error: `Price ID nao configurado para o plano ${planId}. Verifique as variaveis de ambiente.` },
                { status: 500 }
            )
        }

        // Resolve the tenant for the authenticated user
        const supabaseAdmin = getSupabaseAdmin()
        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from('tenants')
            .select('id')
            .eq('owner_id', auth.user.id)
            .single()

        if (tenantError || !tenant) {
            return NextResponse.json(
                { error: 'Tenant nao encontrado para este usuario.' },
                { status: 404 }
            )
        }

        const customerId = await getOrCreateStripeCustomer(tenant.id, auth.user.email)

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

        const session = await getStripe().checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${baseUrl}/dashboard/assinatura?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/dashboard/assinatura?canceled=true`,
            metadata: { tenant_id: tenant.id },
        })

        return NextResponse.json({ url: session.url })
    } catch (error) {
        console.error('Error creating checkout session:', error)
        return NextResponse.json(
            { error: 'Falha ao criar sessao de checkout.' },
            { status: 500 }
        )
    }
}
