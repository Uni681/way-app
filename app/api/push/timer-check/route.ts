import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/web-push'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// pg_cron から X-Cron-Secret ヘッダー付きで呼ばれる
export async function POST(request: Request) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const { data: chats } = await supabaseAdmin.rpc('get_expiring_chats')
    if (!chats?.length) return Response.json({ notified: 0 })

    await Promise.allSettled(
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
        await supabaseAdmin.rpc('mark_timer_notified', { p_chat_id: chat.chat_id })
      })
    )

    return Response.json({ notified: chats.length })
  } catch (err) {
    console.error('[push/timer-check]', err)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
