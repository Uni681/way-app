import { supabase } from './supabase'

export async function apiFetch(path: string, init: RequestInit = {}) {
  if (!path.startsWith('/api/')) throw new Error('Invalid API path')
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init.headers)
  if (session) headers.set('Authorization', `Bearer ${session.access_token}`)
  return fetch(path, { ...init, headers })
}
