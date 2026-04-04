import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getStripe, getOrCreateStripeCustomer } from '@/lib/stripe'

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req)
        if (auth.error) return auth.error

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

        const portalSession = await getStripe().billingPortal.sessions.create({
            customer: customerId,
            return_url: `${baseUrl}/dashboard/assinatura`,
        })

        return NextResponse.json({ url: portalSession.url })
    } catch (error) {
        console.error('Error creating portal session:', error)
        return NextResponse.json(
            { error: 'Falha ao criar sessao do portal de faturamento.' },
            { status: 500 }
        )
    }
}
