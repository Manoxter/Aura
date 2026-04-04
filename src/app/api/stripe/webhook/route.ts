import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripe, planTierFromPriceId } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

/**
 * Stripe webhook handler.
 * Receives events from Stripe and updates the tenant's plan_tier accordingly.
 *
 * SECURITY: Always verifies the webhook signature before processing.
 * Uses service role key for DB updates (never exposed to client).
 */
export async function POST(req: Request) {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET is not set.')
        return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 })
    }

    let event: Stripe.Event

    try {
        event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`Webhook signature verification failed: ${message}`)
        return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                const tenantId = session.metadata?.tenant_id

                if (!tenantId || !session.subscription) {
                    console.warn('checkout.session.completed missing tenant_id or subscription.')
                    break
                }

                // Retrieve subscription to determine the plan
                const subscription = await getStripe().subscriptions.retrieve(
                    session.subscription as string
                )
                const priceId = subscription.items.data[0]?.price?.id
                const planTier = priceId ? planTierFromPriceId(priceId) : null

                if (!planTier) {
                    console.warn(`Unknown price ID in subscription: ${priceId}`)
                    break
                }

                const { error } = await supabaseAdmin
                    .from('tenants')
                    .update({
                        plan_tier: planTier,
                        stripe_sub_id: subscription.id,
                        stripe_customer_id: session.customer as string,
                    })
                    .eq('id', tenantId)

                if (error) {
                    console.error(`Failed to update tenant ${tenantId}:`, error.message)
                }
                break
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription
                const customerId = subscription.customer as string

                const priceId = subscription.items.data[0]?.price?.id
                const planTier = priceId ? planTierFromPriceId(priceId) : null

                if (!planTier) {
                    console.warn(`Subscription updated with unknown price: ${priceId}`)
                    break
                }

                const { error } = await supabaseAdmin
                    .from('tenants')
                    .update({
                        plan_tier: planTier,
                        stripe_sub_id: subscription.id,
                    })
                    .eq('stripe_customer_id', customerId)

                if (error) {
                    console.error(`Failed to sync subscription for customer ${customerId}:`, error.message)
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                const customerId = subscription.customer as string

                const { error } = await supabaseAdmin
                    .from('tenants')
                    .update({
                        plan_tier: 'START',
                        stripe_sub_id: null,
                    })
                    .eq('stripe_customer_id', customerId)

                if (error) {
                    console.error(`Failed to downgrade tenant for customer ${customerId}:`, error.message)
                }
                break
            }

            default:
                // Acknowledge unhandled events without processing
                break
        }
    } catch (error) {
        console.error(`Error processing webhook event ${event.type}:`, error)
        // Still return 200 to prevent Stripe from retrying on application errors
    }

    return NextResponse.json({ received: true }, { status: 200 })
}
