import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

    const sub = await request.json() as {
      endpoint: string
      keys: { auth: string; p256dh: string }
    }

    if (!sub.endpoint || !sub.keys?.auth || !sub.keys?.p256dh) {
      return Response.json({ error: 'invalid_subscription' }, { status: 400 })
    }

    await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          auth: sub.keys.auth,
          p256dh: sub.keys.p256dh,
        },
        { onConflict: 'endpoint' }
      )

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe]', err)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
