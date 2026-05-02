import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (error) {
      console.error('[profile/delete]', error)
      return Response.json({ error: 'delete_failed' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[profile/delete]', err)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
