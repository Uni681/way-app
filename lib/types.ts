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

export type Reaction = {
  emoji: string
  user_id: string
}

export type Message = {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
  is_deleted: boolean
  reactions: Reaction[]
}

export type DrinkItem = {
  id: string
  key: string
  emoji: string
  name: string
  description: string | null
  is_free: boolean
  category: string
  season: string | null
  is_active: boolean
}

export type DrinkUse = {
  id: string
  chat_id: string
  sender_id: string
  item_id: string
  used_at: string
  item: Pick<DrinkItem, 'id' | 'key' | 'emoji' | 'name'>
}

export type Chat = {
  id: string
  user1_id: string
  user2_id: string
  expires_at: string
  status: string
  round_trip_count: number
  freed_at: string | null
}
