import { sendPushToUser, type PushPayload } from '@/lib/web-push'
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

    const body = await request.json() as {
      targetUserId: string
      payload: PushPayload
    }

    if (!body.targetUserId || !body.payload?.title) {
      return Response.json({ error: 'invalid_params' }, { status: 400 })
    }

    // 送信元ユーザーが targetUserId に関係しているか確認（不正送信防止）
    // チャット相手 or ストック相手のみ許可
    const { data: valid } = await supabaseAdmin
      .from('chats')
      .select('id')
      .or(
        `and(user1_id.eq.${user.id},user2_id.eq.${body.targetUserId}),` +
        `and(user1_id.eq.${body.targetUserId},user2_id.eq.${user.id})`
      )
      .limit(1)
      .maybeSingle()

    if (!valid) return Response.json({ error: 'forbidden' }, { status: 403 })

    await sendPushToUser(body.targetUserId, body.payload)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[push/send]', err)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
