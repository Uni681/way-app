import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { authenticate } from '@/lib/api-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request)
    if (!auth) return Response.json({ error: 'unauthorized' }, { status: 401 })
    const { user } = auth

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return Response.json({ error: 'no_customer' }, { status: 400 })
    }

    const stripe = getStripe()
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id)
    if (customer.deleted || customer.metadata.supabase_user_id !== user.id) {
      return Response.json({ error: 'customer_mismatch' }, { status: 409 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
    })

    return Response.json({ url: session.url })
  } catch (err) {
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
