import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) return Response.json({ error: 'no_signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return Response.json({ error: 'invalid_signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata.supabase_user_id
        if (!userId) break
        const isActive = sub.status === 'active' || sub.status === 'trialing'
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: isActive ? 'active' : 'cancelled',
            stripe_subscription_id: sub.id,
          })
          .eq('id', userId)
          .eq('stripe_customer_id', typeof sub.customer === 'string' ? sub.customer : sub.customer.id)
          .throwOnError()
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata.supabase_user_id
        if (!userId) break
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'cancelled', stripe_subscription_id: null })
          .eq('id', userId)
          .eq('stripe_customer_id', typeof sub.customer === 'string' ? sub.customer : sub.customer.id)
          .throwOnError()
        break
      }
    }

    return Response.json({ received: true })
  } catch (err) {
    return Response.json({ error: 'handler_error' }, { status: 500 })
  }
}
