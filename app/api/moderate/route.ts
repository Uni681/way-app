import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Service role key: RLS をバイパスしてメッセージを更新する
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    const { messageId, content } = await request.json() as {
      messageId: string
      content: string
    }

    if (!messageId || !content) {
      return Response.json({ error: 'invalid_params' }, { status: 400 })
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    })

    const verdict =
      response.content[0].type === 'text'
        ? response.content[0].text.trim().toUpperCase()
        : 'SAFE'

    const flagged = verdict === 'FLAGGED'

    if (flagged) {
      // メッセージを削除フラグ + ban_check_status 更新
      await supabaseAdmin
        .from('messages')
        .update({
          is_deleted: true,
          ban_check_status: 'flagged',
          ban_check_layer: 2,
        })
        .eq('id', messageId)
    } else {
      await supabaseAdmin
        .from('messages')
        .update({ ban_check_status: 'passed' })
        .eq('id', messageId)
    }

    return Response.json({ flagged })
  } catch (err) {
    console.error('[moderate]', err)
    // モデレーション失敗はサイレント（チャットをブロックしない）
    return Response.json({ flagged: false })
  }
}
