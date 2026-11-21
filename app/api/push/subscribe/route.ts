import { isPushEndpoint } from '@/lib/api-validation'
import { authenticate } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request)
    if (!auth) return Response.json({ error: 'unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const sub = await request.json().catch(() => null) as {
      endpoint: string
      keys: { auth: string; p256dh: string }
    }

    if (!sub || !isPushEndpoint(sub.endpoint) ||
      typeof sub.keys?.auth !== 'string' || !/^[A-Za-z0-9_-]{22}={0,2}$/.test(sub.keys.auth) ||
      typeof sub.keys?.p256dh !== 'string' || !/^[A-Za-z0-9_-]{87}={0,2}$/.test(sub.keys.p256dh)) {
      return Response.json({ error: 'invalid_subscription' }, { status: 400 })
    }

    const { error } = await supabase
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

    if (error) return Response.json({ error: 'subscription_not_saved' }, { status: 409 })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
