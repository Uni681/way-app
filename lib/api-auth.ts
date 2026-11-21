import { createClient } from '@supabase/supabase-js'

// Browser sessions live in localStorage. Explicit Bearer tokens also avoid cookie CSRF.
export async function authenticate(request: Request) {
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') ?? '')
  if (!match) return null
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${match[1]}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
  const { data: { user }, error } = await supabase.auth.getUser(match[1])
  return error || !user ? null : { user, supabase }
}
