import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase'

// Lazy initialization — only fails when actually called, not at build time
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
    if (!_stripe) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY is not set. Configure it in Vercel Environment Variables.')
        }
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            apiVersion: '2026-02-25.clover' as any,
            typescript: true,
        })
    }
    return _stripe
}

/** @deprecated Use getStripe() for lazy initialization */
export const stripe = process.env.STRIPE_SECRET_KEY
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' as any, typescript: true })
    : (null as unknown as Stripe)

/**
 * Maps Aura plan tiers to Stripe Price IDs.
 * Configure via environment variables:
 *   STRIPE_PRICE_PRO=price_...
 *   STRIPE_PRICE_ELITE=price_...
 */
export const PRICE_IDS: Record<'PRO' | 'ELITE', string> = {
    PRO: process.env.STRIPE_PRICE_PRO ?? '',
    ELITE: process.env.STRIPE_PRICE_ELITE ?? '',
}

/**
 * Maps a Stripe Price ID back to its Aura plan tier.
 */
export function planTierFromPriceId(priceId: string): 'PRO' | 'ELITE' | null {
    if (priceId === PRICE_IDS.PRO) return 'PRO'
    if (priceId === PRICE_IDS.ELITE) return 'ELITE'
    return null
}

/**
 * Gets the Stripe customer ID for a tenant. If none exists, creates a new
 * Stripe customer and stores the ID in the tenants table.
 */
export async function getOrCreateStripeCustomer(
    tenantId: string,
    email?: string
): Promise<string> {
    const supabaseAdmin = getSupabaseAdmin()

    // Check if tenant already has a Stripe customer ID
    const { data: tenant, error: fetchError } = await supabaseAdmin
        .from('tenants')
        .select('stripe_customer_id, owner_id')
        .eq('id', tenantId)
        .single()

    if (fetchError || !tenant) {
        throw new Error(`Tenant not found: ${tenantId}`)
    }

    if (tenant.stripe_customer_id) {
        return tenant.stripe_customer_id
    }

    // Create a new Stripe customer
    const customer = await getStripe().customers.create({
        email: email ?? undefined,
        metadata: { tenant_id: tenantId, owner_id: tenant.owner_id },
    })

    // Persist the Stripe customer ID
    const { error: updateError } = await supabaseAdmin
        .from('tenants')
        .update({ stripe_customer_id: customer.id })
        .eq('id', tenantId)

    if (updateError) {
        throw new Error(`Failed to save Stripe customer ID: ${updateError.message}`)
    }

    return customer.id
}
