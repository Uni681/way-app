import { createClient } from '@supabase/supabase-js'
import { authenticate } from '@/lib/api-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function DELETE(request: Request) {
  try {
    const auth = await authenticate(request)
    if (!auth) return Response.json({ error: 'unauthorized' }, { status: 401 })
    const { user } = auth

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (error) {
      return Response.json({ error: 'delete_failed' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
