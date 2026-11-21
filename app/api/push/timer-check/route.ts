import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/web-push'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const maxDuration = 60

// pg_cron から X-Cron-Secret ヘッダー付きで呼ばれる
export async function POST(request: Request) {
  const secret = request.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const { data: chats, error } = await supabaseAdmin.rpc('get_expiring_chats')
    if (error) throw new Error('timer_read_failed')
    if (!chats?.length) return Response.json({ notified: 0 })

    const results = await Promise.allSettled(
      chats.map(async (chat: { chat_id: string; user1_id: string; user2_id: string }) => {
        const payload = {
          title: 'WAY',
          body: 'あと1時間で消える',
          url: `/chat/${chat.chat_id}`,
          tag: `timer-${chat.chat_id}`,
        }
        await Promise.all([
          sendPushToUser(chat.user1_id, payload),
          sendPushToUser(chat.user2_id, payload),
        ])
        const { error } = await supabaseAdmin.rpc('mark_timer_notified', { p_chat_id: chat.chat_id })
        if (error) throw new Error('timer_update_failed')
      })
    )

    return Response.json({ processed: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length },
      { status: results.some(r => r.status === 'rejected') ? 503 : 200 })
  } catch (err) {
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
