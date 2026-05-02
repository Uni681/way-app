'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type ChatSummary = {
  id: string
  otherCodename: string
  expiresAt: string | null
  status: string
  roundTripCount: number
  encounterNumber: number
}

function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function pad(n: number) { return n.toString().padStart(2, '0') }

function Countdown({ expiresAt }: { expiresAt: string | null }) {
  const now = useNow()
  if (!expiresAt) return <span className="text-way-green text-xs font-medium">自由チャット</span>
  const diff = new Date(expiresAt).getTime() - now
  if (diff <= 0) return <span className="text-way-muted text-xs">タイムアップ</span>
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const critical = h === 0 && m < 10
  return (
    <span
      className="text-xs font-mono font-medium"
      style={{ color: critical ? 'var(--way-terracotta)' : 'var(--way-muted)' }}
    >
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  )
}

export default function ChatsPage() {
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [loading, setLoading] = useState(true)
  const uidRef = useRef<string | null>(null)
  const router = useRouter()

  async function loadChats(uid: string) {
    const { data } = await supabase
      .from('chats')
      .select(`
        id, expires_at, status, round_trip_count, encounter_number,
        user1_id, user2_id,
        user1:user1_id ( codename ),
        user2:user2_id ( codename )
      `)
      .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
      .in('status', ['active', 'freed'])
      .order('expires_at', { ascending: true })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: ChatSummary[] = (data ?? []).map((c: any) => ({
      id: c.id,
      otherCodename: c.user1_id === uid ? c.user2.codename : c.user1.codename,
      expiresAt: c.status === 'freed' ? null : c.expires_at,
      status: c.status,
      roundTripCount: c.round_trip_count,
      encounterNumber: c.encounter_number,
    }))

    setChats(items)
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth'); return }
      uidRef.current = session.user.id
      await loadChats(session.user.id)
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    const channel = supabase
      .channel('chats-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        if (uidRef.current) loadChats(uidRef.current)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <>
      <header className="flex items-center gap-3 px-5 py-4 border-b border-way-wood-light shrink-0">
        <h1 className="font-medium text-way-text">チャット</h1>
      </header>

      <main className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <p className="text-way-muted text-sm">…</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-8 gap-4">
            <p className="text-4xl">💬</p>
            <p className="text-way-muted text-sm text-center">
              進行中のチャットはありません
            </p>
            <Link
              href="/"
              className="mt-2 px-5 py-2.5 rounded-2xl bg-way-green text-white text-sm font-medium"
            >
              声を投げに行く
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-way-wood-light">
            {chats.map(chat => (
              <li key={chat.id}>
                <Link
                  href={`/chat/${chat.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-way-surface transition-colors active:bg-way-wood-light"
                >
                  {/* アバター代替 */}
                  <div className="w-11 h-11 rounded-full bg-way-wood-light border border-way-wood flex items-center justify-center text-way-text text-base font-medium shrink-0 select-none">
                    {chat.otherCodename[0]}
                  </div>

                  {/* テキスト */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-way-text truncate">{chat.otherCodename}</p>
                    <p className="text-xs text-way-muted mt-0.5">
                      {chat.encounterNumber}回目の出会い・{chat.roundTripCount}往復
                    </p>
                  </div>

                  {/* タイマー */}
                  <div className="shrink-0 text-right">
                    <Countdown expiresAt={chat.expiresAt} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
