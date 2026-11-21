import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { authenticate } from '@/lib/api-auth'
import { isUuid } from '@/lib/api-validation'

const SYSTEM_PROMPT = `あなたはチャットアプリの安全審査AIです。
以下のいずれかに該当する場合のみ "FLAGGED" と返してください。それ以外は "SAFE" と返してください。
- 連絡先交換（LINE, Instagram, 電話番号, メールアドレス, 各種SNS）
- オフ会・実際の待ち合わせの提案
- 性的な勧誘・売春・援助交際
- 暴力的な脅迫・死の脅し
- 差別・民族・性別への侮辱

1単語（FLAGGED または SAFE）のみを返してください。理由は不要です。`

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
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0, timeout: 15000 })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 10, system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message.content }],
    })
    const block = response.content[0]
    const verdict = block?.type === 'text' ? block.text.trim() : ''
    if (verdict !== 'SAFE' && verdict !== 'FLAGGED') {
      return Response.json({ error: 'moderation_unavailable' }, { status: 502 })
    }
    // Only the final write uses elevated privileges; never accept caller text/status.
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } })
    const flagged = verdict === 'FLAGGED'
    const { data: updated, error } = await admin.from('messages')
      .update(flagged ? { is_deleted: true, ban_check_status: 'flagged', ban_check_layer: 2 }
        : { ban_check_status: 'passed', ban_check_layer: 2 })
      .eq('id', message.id).eq('sender_id', auth.user.id).eq('chat_id', message.chat_id)
      .eq('content', message.content).eq('is_deleted', false).eq('ban_check_status', 'pending')
      .select('id').maybeSingle()
    if (error) throw new Error('moderation_write_failed')
    if (!updated) return Response.json({ error: 'state_changed' }, { status: 409 })
    return Response.json({ flagged })
  } catch {
    // Do not log tokens, message text, SDK request bodies or provider errors.
    return Response.json({ error: 'moderation_unavailable' }, { status: 503 })
  }
}
