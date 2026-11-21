import webpush from 'web-push'
import { isPushEndpoint } from './api-validation'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type PushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
}

// At most one network attempt per (recipient,event). Unknown outcomes are not retried.
export async function sendPushToUser(userId: string, payload: PushPayload, actorId?: string): Promise<boolean> {
  const { data: deliveryId, error: reserveError } = await supabaseAdmin.rpc('reserve_push', {
    p_user_id: userId, p_event_key: payload.tag, p_actor_id: actorId ?? null,
  })
  if (reserveError) throw new Error('push_limit_or_unavailable')
  if (!deliveryId) return false
  try {
    webpush.setVapidDetails(process.env.VAPID_EMAIL!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)
    const { data: subs, error } = await supabaseAdmin.from('push_subscriptions')
      .select('endpoint, auth, p256dh').eq('user_id', userId).limit(3)
    if (error) throw new Error('subscription_read_failed')
    const valid = (subs ?? []).filter(sub => isPushEndpoint(sub.endpoint))
    let failed = false
    for (const sub of valid) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
          JSON.stringify(payload), { timeout: 10000 },
        )
      } catch (error) {
        failed = true
        if (typeof error === 'object' && error !== null && 'statusCode' in error &&
          [404, 410].includes(Number(error.statusCode))) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', sub.endpoint)
        }
      }
    }
    const { error: finishError } = await supabaseAdmin.rpc('finish_push', {
      p_delivery_id: deliveryId, p_outcome: failed ? 'failed' : valid.length ? 'sent' : 'no_subscription',
    })
    if (finishError || failed) throw new Error('push_delivery_failed')
    return true
  } catch {
    await supabaseAdmin.rpc('finish_push', { p_delivery_id: deliveryId, p_outcome: 'failed' })
    throw new Error('push_delivery_failed')
  }
}
