import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

    // 既存の stripe_customer_id を取得
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, codename')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    const stripe = getStripe()

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.codename ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?subscribed=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
      locale: 'ja',
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/checkout]', err)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
