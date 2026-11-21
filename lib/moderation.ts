import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT = `あなたはチャットアプリの安全審査AIです。
以下のいずれかに該当する場合のみ "FLAGGED" と返してください。それ以外は "SAFE" と返してください。
- 連絡先交換（LINE, Instagram, 電話番号, メールアドレス, 各種SNS）
- オフ会・実際の待ち合わせの提案
- 性的な勧誘・売春・援助交際
- 暴力的な脅迫・死の脅し
- 差別・民族・性別への侮辱

1単語（FLAGGED または SAFE）のみを返してください。理由は不要です。`

// The DB claim is shared by the optional fast path and the mandatory scheduled worker.
export async function processModeration(messageId?: string): Promise<Response> {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: jobs, error: claimError } = await admin.rpc('claim_moderation', { p_message_id: messageId ?? null })
  if (claimError) return Response.json({ error: 'moderation_unavailable' }, { status: 503 })
  const job = jobs?.[0]
  if (!job) return Response.json({ error: 'state_changed' }, { status: 409 })
  let verdict: 'SAFE' | 'FLAGGED'
  let failureStatus = 503
  try {
    if (typeof job.content !== 'string' || !job.content.trim() || job.content.length > 4000) throw new Error('invalid_content')
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0, timeout: 15000 })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 10, system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: job.content }],
    })
    const block = response.content[0]
    const text = block?.type === 'text' ? block.text.trim() : ''
    if (text !== 'SAFE' && text !== 'FLAGGED') { failureStatus = 502; throw new Error('invalid_verdict') }
    verdict = text
  } catch (error) {
    // A timed-out/disconnected request may still be running at the provider. Do not replay it.
    const uncertain = typeof error === 'object' && error !== null && 'name' in error &&
      ['APIConnectionTimeoutError', 'APIConnectionError', 'AbortError'].includes(String(error.name))
    // If this DB write also fails, the lease expires into HOLD, never into approval.
    await admin.rpc('finish_moderation', {
      p_message_id: job.message_id, p_lease_token: job.lease_token, p_verdict: uncertain ? 'HOLD' : 'ERROR',
    })
    return Response.json({ error: 'moderation_unavailable' }, { status: failureStatus })
  }
  const { data: finished, error } = await admin.rpc('finish_moderation', {
    p_message_id: job.message_id, p_lease_token: job.lease_token, p_verdict: verdict,
  })
  if (error) return Response.json({ error: 'moderation_unavailable' }, { status: 503 })
  if (!finished) return Response.json({ error: 'state_changed' }, { status: 409 })
  return Response.json({ flagged: verdict === 'FLAGGED' })
}
