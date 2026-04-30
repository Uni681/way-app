'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const FREED_THRESHOLD = 30
const COMPLETED_TRIPS = 20

type ChatEntry = {
  id: string
  created_at: string
  round_trip_count: number
  freed_at: string | null
  status: string
  encounterNumber: number
}

export default function StockDetailPage() {
  const { userId: targetUserId } = useParams<{ userId: string }>()
  const router = useRouter()

  const [codename, setCodename] = useState('')
  const [encounters, setEncounters] = useState<ChatEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showReceipt, setShowReceipt] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth'); return }
      const uid = session.user.id

      const [profileRes, chatsRes] = await Promise.all([
        supabase.from('profiles').select('codename').eq('id', targetUserId).single(),
        supabase.from('chats')
          .select('id, created_at, round_trip_count, freed_at, status, user1_id, user2_id')
          .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
          .order('created_at', { ascending: true }),
      ])

      if (profileRes.data) setCodename(profileRes.data.codename)

      const pairChats = (chatsRes.data ?? [])
        .filter(c =>
          (c.user1_id === uid && c.user2_id === targetUserId) ||
          (c.user1_id === targetUserId && c.user2_id === uid)
        )
        .map((c, i) => ({ ...c, encounterNumber: i + 1 }))

      setEncounters(pairChats)
      if (pairChats.length >= FREED_THRESHOLD) setShowReceipt(true)

      setLoading(false)
    }
    init()
  }, [targetUserId, router])

  const count = encounters.length
  const probability = Math.min(100, Math.max(15, Math.round(count / 30 * 100)))

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-way-muted text-sm">…</p>
      </div>
    )
  }

  return (
    <>
      <header className="flex items-center gap-3 px-4 py-3 border-b border-way-wood-light shrink-0">
        <Link href="/stocks" className="text-way-muted hover:text-way-text transition-colors text-lg">
          ←
        </Link>
        <p className="flex-1 font-medium text-way-text">{codename}</p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-8 min-h-0">
        {/* 再会確率 */}
        <section>
          <p className="text-xs font-medium text-way-muted uppercase tracking-wider mb-4">再会確率</p>
          <div className="bg-way-surface border border-way-wood-light rounded-2xl px-5 py-5">
            <div className="flex items-end justify-between mb-3">
              <span className="text-4xl font-bold text-way-text">{probability}%</span>
              <span className="text-xs text-way-muted">{count}回の再会</span>
            </div>
            <div className="h-2.5 rounded-full bg-way-wood-light overflow-hidden">
              <div
                className="h-full rounded-full bg-way-green transition-all duration-700"
                style={{ width: `${probability}%` }}
              />
            </div>
            <p className="text-xs text-way-muted mt-3">
              {count < FREED_THRESHOLD
                ? `あと${FREED_THRESHOLD - count}回で自由チャット開放`
                : '自由チャット開放済み ✓'}
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full mt-4 py-3.5 rounded-2xl bg-way-green text-white text-sm font-medium active:opacity-80 transition-opacity"
          >
            声を投げる
          </button>
        </section>

        {/* 再会履歴 */}
        <section>
          <p className="text-xs font-medium text-way-muted uppercase tracking-wider mb-3">再会履歴</p>
          {encounters.length === 0 ? (
            <p className="text-sm text-way-muted text-center py-8">まだ再会していません</p>
          ) : (
            <div className="space-y-2">
              {[...encounters].reverse().map(e => (
                <Link
                  key={e.id}
                  href={`/chat/${e.id}`}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl bg-way-surface border border-way-wood-light hover:border-way-green transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-way-text">第{e.encounterNumber}回</span>
                    {e.freed_at && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-way-green/10 text-way-green border border-way-green leading-none">
                        自由
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-way-muted">{e.round_trip_count}往復</span>
                    {e.round_trip_count >= COMPLETED_TRIPS && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-way-wood-light text-way-muted leading-none">
                        完走
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 30回達成レシート */}
      {showReceipt && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowReceipt(false)} />
          <div
            className="fixed z-50 bg-way-surface rounded-2xl overflow-hidden shadow-2xl"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'calc(100% - 48px)',
              maxWidth: 360,
            }}
          >
            <div className="px-8 py-8">
              <p
                className="text-center font-bold tracking-widest text-way-text text-xl mb-2"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                WAY
              </p>
              <div className="border-t border-dashed border-way-wood my-4" />
              <p className="text-center text-sm text-way-text mb-1 leading-relaxed">
                この会話が、ずっとここにある
              </p>
              <div className="border-t border-dashed border-way-wood my-4" />
              <div className="space-y-3 my-5">
                <div className="flex justify-between text-sm">
                  <span className="text-way-muted">相手</span>
                  <span className="font-medium text-way-text">{codename}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-way-muted">再会回数</span>
                  <span className="font-medium text-way-text">{count}回</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-way-muted">自由チャット</span>
                  <span className="text-way-green font-medium">開放 ✓</span>
                </div>
              </div>
              <div className="border-t border-dashed border-way-wood my-4" />
              <p className="text-center text-[10px] text-way-muted">
                {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => setShowReceipt(false)}
              className="w-full py-4 bg-way-green text-white text-sm font-medium"
            >
              とじる
            </button>
          </div>
        </>
      )}
    </>
  )
}
