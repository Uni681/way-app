import { processModeration } from '@/lib/moderation'
import { authenticate } from '@/lib/api-auth'
import { isUuid } from '@/lib/api-validation'

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request)
    if (!auth) return Response.json({ error: 'unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => null)
    if (!isUuid(body?.messageId)) {
      return Response.json({ error: 'invalid_params' }, { status: 400 })
    }
    // Read through the caller's RLS, then verify ownership AND chat participation.
    const { data: message, error: readError } = await auth.supabase.from('messages')
      .select('id, chat_id, sender_id, content, is_deleted, ban_check_status')
      .eq('id', body.messageId).eq('sender_id', auth.user.id).maybeSingle()
    if (readError) throw new Error('message_read_failed')
    if (!message || message.sender_id !== auth.user.id) {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }
    const { data: chat, error: chatError } = await auth.supabase.from('chats')
      .select('user1_id, user2_id').eq('id', message.chat_id).maybeSingle()
    if (chatError) throw new Error('chat_read_failed')
    if (!chat || ![chat.user1_id, chat.user2_id].includes(auth.user.id)) {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }
    if (message.is_deleted || message.ban_check_status !== 'pending') {
      return Response.json({ error: 'already_processed' }, { status: 409 })
    }
    if (typeof message.content !== 'string' || !message.content.trim() || message.content.length > 4000) {
      return Response.json({ error: 'invalid_content' }, { status: 422 })
    }
    return processModeration(message.id)
  } catch {
    // Do not log tokens, message text, SDK request bodies or provider errors.
    return Response.json({ error: 'moderation_unavailable' }, { status: 503 })
  }
}
