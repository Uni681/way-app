export type Voice = {
  id: string
  user_id: string
  content: string
  created_at: string
  status: string
  chat_id: string | null
}

export type Profile = {
  id: string
  codename: string
  avatar_url: string | null
}
