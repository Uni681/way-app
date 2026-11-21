import { sendPushToUser } from '@/lib/web-push'
import { authenticate } from '@/lib/api-auth'
import { isUuid } from '@/lib/api-validation'

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request)
    if (!auth) return Response.json({ error: 'unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null)
    if (!isUuid(body?.chatId) || !['chat_started', 'mutual_stock'].includes(body?.event)) {
      return Response.json({ error: 'invalid_params' }, { status: 400 })
    }
    const { user, supabase } = auth
    const { data: chat, error } = await supabase.from('chats')
      .select('id, user1_id, user2_id, status, expires_at').eq('id', body.chatId).maybeSingle()
    if (error) throw new Error('chat_read_failed')
    if (!chat || ![chat.user1_id, chat.user2_id].includes(user.id) ||
      !(chat.status === 'freed' || (chat.status === 'active' && Date.parse(chat.expires_at) > Date.now()))) {
      return Response.json({ error: 'forbidden' }, { status: 403 })
    }
    const target = chat.user1_id === user.id ? chat.user2_id : chat.user1_id
    if (body.event === 'chat_started' && chat.user2_id !== user.id) {
      return Response.json({ error: 'forbidden' }, { status: 403 })
    }
    if (body.event === 'mutual_stock') {
      const { data: stocks, error: stockError } = await supabase.from('stocks')
        .select('user_id, target_user_id').in('user_id', [user.id, target]).in('target_user_id', [user.id, target])
      if (stockError) throw new Error('stock_read_failed')
      if (!stocks?.some(s => s.user_id === user.id && s.target_user_id === target) ||
        !stocks.some(s => s.user_id === target && s.target_user_id === user.id)) {
        return Response.json({ error: 'forbidden' }, { status: 403 })
      }
    }
    // Recipient, text and navigation are derived on the server, never supplied by the caller.
    const sent = await sendPushToUser(target, {
      title: 'WAY', body: body.event === 'chat_started' ? '誰かが乗ってきた' : '相思相愛になった。ストックされた。',
      url: `/chat/${chat.id}`, tag: `${body.event}-${chat.id}`,
    }, user.id)
    return Response.json({ ok: true, sent })
  } catch {
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
