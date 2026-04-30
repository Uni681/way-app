'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const MAX_STOCKS = 5

type MutualStock = {
  userId: string
  codename: string
  encounterCount: number
  probability: number
  isOnline: boolean
  isFreed: boolean
}

type BookmarkEntry = {
  userId: string
  codename: string
}

export default function StocksPage() {
  const router = useRouter()
  const [mutuals, setMutuals] = useState<MutualStock[]>([])
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmRelease, setConfirmRelease] = useState<string | null>(null)
  const [releasing, setReleasing] = useState(false)
  const [myUserId, setMyUserId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth'); return }
      const uid = session.user.id
      setMyUserId(uid)

      const { data: myStocks } = await supabase
        .from('stocks')
        .select('target_user_id')
        .eq('user_id', uid)

      const { data: stockedBy } = await supabase
        .from('stocks')
        .select('user_id')
        .eq('target_user_id', uid)

      const stockedBySet = new Set(stockedBy?.map(s => s.user_id) ?? [])
      const mutualIds = (myStocks ?? [])
        .filter(s => stockedBySet.has(s.target_user_id))
        .map(s => s.target_user_id)
        .slice(0, MAX_STOCKS)

      if (mutualIds.length > 0) {
        const [profilesRes, chatsRes] = await Promise.all([
          supabase.from('profiles').select('id, codename').in('id', mutualIds),
          supabase.from('chats')
            .select('user1_id, user2_id, freed_at, status, created_at')
            .or(`user1_id.eq.${uid},user2_id.eq.${uid}`),
        ])

        const profileMap = new Map((profilesRes.data ?? []).map(p => [p.id, p.codename]))
        const allMyChats = chatsRes.data ?? []

        const result: MutualStock[] = mutualIds.map(targetId => {
          const chatsWithTarget = allMyChats
            .filter(c =>
              (c.user1_id === uid && c.user2_id === targetId) ||
              (c.user1_id === targetId && c.user2_id === uid)
            )
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

          const encounterCount = chatsWithTarget.length
          const probability = Math.min(100, Math.max(15, Math.round(encounterCount / 30 * 100)))
          const isOnline = chatsWithTarget.some(c => c.status === 'active')
          const isFreed = chatsWithTarget.some(c => c.freed_at !== null)

          return { userId: targetId, codename: profileMap.get(targetId) ?? '???', encounterCount, probability, isOnline, isFreed }
        })
        setMutuals(result)
      }

      const { data: bookmarkRows } = await supabase
        .from('bookmarks').select('target_user_id').eq('user_id', uid)

      if (bookmarkRows && bookmarkRows.length > 0) {
        const bIds = bookmarkRows.map(b => b.target_user_id)
        const { data: bProfiles } = await supabase
          .from('profiles').select('id, codename').in('id', bIds)
        const bMap = new Map((bProfiles ?? []).map(p => [p.id, p.codename]))
        setBookmarks(bIds.map(id => ({ userId: id, codename: bMap.get(id) ?? '???' })))
      }

      setLoading(false)
    }
    init()
  }, [router])

  async function handleRelease(targetUserId: string) {
    if (releasing || !myUserId) return
    setReleasing(true)
    await supabase.from('stocks').delete().eq('user_id', myUserId).eq('target_user_id', targetUserId)
    setMutuals(prev => prev.filter(m => m.userId !== targetUserId))
    setConfirmRelease(null)
    setReleasing(false)
  }

  const isFull = mutuals.length >= MAX_STOCKS

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-way-muted text-sm">…</p>
      </div>
    )
  }

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 border-b border-way-wood-light shrink-0">
        <h2 className="font-semibold text-way-text">ストック</h2>
        <div className="flex gap-1.5 items-center">
          {Array.from({ length: MAX_STOCKS }).map((_, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i < mutuals.length ? 'bg-way-green' : 'bg-way-wood-light'
              }`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {mutuals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-way-muted text-sm">まだ相思相愛のストックはありません</p>
            <p className="text-way-muted text-xs text-center leading-relaxed">
              チャット後にお互いストックすると<br />ここに表示されます
            </p>
          </div>
        ) : (
          mutuals.map(m => (
            <StockCard
              key={m.userId}
              entry={m}
              onRelease={() => setConfirmRelease(m.userId)}
              onClick={() => router.push(`/stocks/${m.userId}`)}
            />
          ))
        )}

        {isFull && bookmarks.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium text-way-muted uppercase tracking-wider mb-3">印</p>
            <div className="space-y-2">
              {bookmarks.map(b => (
                <div
                  key={b.userId}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-way-surface border border-way-wood-light"
                >
                  <span className="text-base">🔖</span>
                  <span className="text-sm font-medium text-way-text">{b.codename}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {confirmRelease && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setConfirmRelease(null)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-way-base rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl"
            style={{ maxWidth: 430, margin: '0 auto' }}
          >
            <p className="text-center font-semibold text-way-text mb-1">ほんとに消すの？</p>
            <p className="text-center text-sm text-way-muted mb-7">この会話は戻りません。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRelease(null)}
                className="flex-1 py-3 rounded-2xl border border-way-wood-light text-way-muted text-sm"
              >
                やめる
              </button>
              <button
                onClick={() => handleRelease(confirmRelease)}
                disabled={releasing}
                className="flex-1 py-3 rounded-2xl bg-way-terracotta text-white text-sm font-medium disabled:opacity-40 transition-opacity"
              >
                解除する
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function StockCard({
  entry,
  onRelease,
  onClick,
}: {
  entry: MutualStock
  onRelease: () => void
  onClick: () => void
}) {
  return (
    <div
      className="px-4 py-3 rounded-2xl bg-way-surface border border-way-wood-light cursor-pointer active:opacity-75 transition-opacity"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${entry.isOnline ? 'bg-way-green' : 'bg-way-wood'}`} />
          <span className="font-medium text-sm text-way-text">{entry.codename}</span>
          {entry.isFreed && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-way-green/10 text-way-green border border-way-green leading-none">
              自由
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-way-muted">{entry.encounterCount}回</span>
          <button
            onClick={e => { e.stopPropagation(); onRelease() }}
            className="text-xs text-way-muted hover:text-way-terracotta transition-colors px-2 py-1 rounded-lg"
          >
            解除
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-way-wood-light overflow-hidden">
          <div className="h-full rounded-full bg-way-green" style={{ width: `${entry.probability}%` }} />
        </div>
        <span className="text-xs text-way-muted w-9 text-right shrink-0">{entry.probability}%</span>
      </div>
    </div>
  )
}
