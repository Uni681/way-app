'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { checkLayer1, LAYER1_ERROR_MESSAGE } from '@/lib/banned_words'
import type { Chat, DrinkItem, Message, Reaction } from '@/lib/types'
import DrinkBar from './_components/DrinkBar'
import MessageItem from './_components/MessageItem'
import FreedCelebration from './_components/FreedCelebration'

// ── フィードアイテム型 ───────────────────────────────────────────
type FeedMsg = { kind: 'message' } & Message
type FeedDrink = {
  kind: 'drink'
  id: string
  sender_id: string
  created_at: string
  item: Pick<DrinkItem, 'emoji' | 'name' | 'key'>
}
type FeedItem = FeedMsg | FeedDrink

// ── カウントダウン ────────────────────────────────────────────────
function useCountdown(expiresAt: string | null) {
  const [t, setT] = useState({ h: 0, m: 0, s: 0 })
  useEffect(() => {
    if (!expiresAt) return
    function tick() {
      const diff = new Date(expiresAt!).getTime() - Date.now()
      if (diff <= 0) { setT({ h: 0, m: 0, s: 0 }); return }
      setT({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  return t
}

function pad(n: number) { return n.toString().padStart(2, '0') }

// ── メイン ────────────────────────────────────────────────────────
export default function ChatPage() {
  const { id: chatId } = useParams<{ id: string }>()
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [chat, setChat] = useState<Chat | null>(null)
  const [otherCodename, setOtherCodename] = useState('')
  const [otherUserId, setOtherUserId] = useState<string | null>(null)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [drinkItems, setDrinkItems] = useState<DrinkItem[]>([])
  const [input, setInput] = useState('')
  const [drinkBarOpen, setDrinkBarOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sendError, setSendError] = useState<string | null>(null)
  const [showFreedCelebration, setShowFreedCelebration] = useState(false)
  const [stockStatus, setStockStatus] = useState<'none' | 'mine' | 'mutual'>('none')
  const [slotsFull, setSlotsFull] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [stocking, setStocking] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const messageIdsRef = useRef<Set<string>>(new Set())
  const reactionsRef = useRef<Map<string, Reaction[]>>(new Map())

  const timer = useCountdown(chat?.expires_at ?? null)
  const timerCritical = timer.h === 0 && timer.m < 60
  const freed = chat?.status === 'freed'

  // ── データ取得 ─────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth'); return }
      const uid = session.user.id
      setUserId(uid)

      const { data: chatData } = await supabase
        .from('chats')
        .select(`
          id, user1_id, user2_id, expires_at, status,
          round_trip_count, encounter_number, freed_at,
          user1:user1_id ( codename ),
          user2:user2_id ( codename )
        `)
        .eq('id', chatId)
        .single()

      if (!chatData) { router.replace('/'); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = chatData as any
      const chatObj: Chat = {
        id: raw.id,
        user1_id: raw.user1_id,
        user2_id: raw.user2_id,
        expires_at: raw.expires_at,
        status: raw.status,
        round_trip_count: raw.round_trip_count,
        encounter_number: raw.encounter_number ?? 1,
        freed_at: raw.freed_at,
      }
      setChat(chatObj)

      const otherId = raw.user1_id === uid ? raw.user2_id : raw.user1_id
      setOtherUserId(otherId)
      setOtherCodename(raw.user1_id === uid ? raw.user2.codename : raw.user1.codename)

      // 30回達成オーバーレイ（初回のみ）
      if (
        raw.status === 'freed' &&
        typeof window !== 'undefined' &&
        !localStorage.getItem(`freed_seen:${chatId}`)
      ) {
        setShowFreedCelebration(true)
      }

      const { data: msgs } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at, is_deleted, reactions(emoji, user_id)')
        .eq('chat_id', chatId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      const messages: FeedMsg[] = (msgs ?? []).map(m => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = (m as any).reactions as Reaction[] ?? []
        messageIdsRef.current.add(m.id)
        reactionsRef.current.set(m.id, r)
        return { kind: 'message' as const, chat_id: chatId, ...m, reactions: r }
      })

      const { data: drinks } = await supabase
        .from('drink_bar_uses')
        .select('id, sender_id, used_at, item:item_id(id, emoji, name, key)')
        .eq('chat_id', chatId)
        .order('used_at', { ascending: true })

      const drinkFeed: FeedDrink[] = (drinks ?? []).map(d => ({
        kind: 'drink',
        id: d.id,
        sender_id: d.sender_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        created_at: (d as any).used_at,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        item: (d as any).item,
      }))

      setFeed(
        [...messages, ...drinkFeed].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      )

      const { data: items } = await supabase
        .from('drink_bar_items')
        .select('*')
        .eq('is_active', true)
        .order('is_free', { ascending: false })

      setDrinkItems(items ?? [])
      setLoading(false)
    }

    init()
  }, [chatId, router])

  // ── Realtime ───────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`chat-room-${chatId}`)

      // 新メッセージ
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const m = payload.new as Message & { is_deleted: boolean }
          if (m.is_deleted) return
          messageIdsRef.current.add(m.id)
          reactionsRef.current.set(m.id, [])
          setFeed(prev => [...prev, { kind: 'message', ...m, reactions: [] }])
        }
      )

      // Layer 2 BAN: メッセージ削除フラグを受信して画面から消す
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const m = payload.new as Message & { is_deleted: boolean }
          if (m.is_deleted) {
            setFeed(prev => prev.filter(item => !(item.kind === 'message' && item.id === m.id)))
          }
        }
      )

      // 新ドリンク
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'drink_bar_uses', filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const d = payload.new as { id: string; sender_id: string; used_at: string; item_id: string }
          const item = drinkItems.find(i => i.id === d.item_id)
          if (!item) return
          setFeed(prev => [...prev, {
            kind: 'drink',
            id: d.id,
            sender_id: d.sender_id,
            created_at: d.used_at,
            item: { emoji: item.emoji, name: item.name, key: item.key },
          }])
        }
      )

      // リアクション追加
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reactions' },
        (payload) => {
          const r = payload.new as Reaction & { message_id: string }
          if (!messageIdsRef.current.has(r.message_id)) return
          setFeed(prev =>
            prev.map(item =>
              item.kind === 'message' && item.id === r.message_id
                ? { ...item, reactions: [...item.reactions, { emoji: r.emoji, user_id: r.user_id }] }
                : item
            )
          )
        }
      )

      // リアクション削除
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'reactions' },
        (payload) => {
          const r = payload.old as Reaction & { message_id: string }
          if (!messageIdsRef.current.has(r.message_id)) return
          setFeed(prev =>
            prev.map(item =>
              item.kind === 'message' && item.id === r.message_id
                ? { ...item, reactions: item.reactions.filter(x => !(x.emoji === r.emoji && x.user_id === r.user_id)) }
                : item
            )
          )
        }
      )

      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chatId, userId, drinkItems])

  // ── スクロール ─────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feed])

  // ── 送信（Layer 1 + Layer 2） ──────────────────────────────────
  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || !userId || sending) return

    // Layer 1: クライアント側キーワードチェック
    const l1 = checkLayer1(trimmed)
    if (l1.blocked) {
      setSendError(LAYER1_ERROR_MESSAGE)
      return
    }
    setSendError(null)
    setSending(true)

    const { data: inserted } = await supabase
      .from('messages')
      .insert({ chat_id: chatId, sender_id: userId, content: trimmed })
      .select('id')
      .single()

    setInput('')
    setSending(false)

    // Layer 2: Claude API による非同期審査（fire-and-forget）
    if (inserted) {
      fetch('/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: inserted.id, content: trimmed }),
      }).catch(() => {})
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── ドリンク送信 ─────────────────────────────────────────────────
  async function handleDrinkSend(item: DrinkItem) {
    if (!userId || sending) return
    setSending(true)
    setDrinkBarOpen(false)
    await supabase
      .from('drink_bar_uses')
      .insert({ chat_id: chatId, sender_id: userId, item_id: item.id })
    setSending(false)
  }

  // ── ストック状態読み込み ───────────────────────────────────────────
  useEffect(() => {
    if (!userId || !otherUserId) return
    async function loadStock() {
      const [myStockRes, theirStockRes, myMutualsRes, bookmarkRes] = await Promise.all([
        supabase.from('stocks').select('id').eq('user_id', userId!).eq('target_user_id', otherUserId!).maybeSingle(),
        supabase.from('stocks').select('id').eq('user_id', otherUserId!).eq('target_user_id', userId!).maybeSingle(),
        supabase.from('stocks').select('target_user_id').eq('user_id', userId!),
        supabase.from('bookmarks').select('id').eq('user_id', userId!).eq('target_user_id', otherUserId!).maybeSingle(),
      ])

      const iMine = !!myStockRes.data
      const theyMine = !!theirStockRes.data
      setStockStatus(iMine && theyMine ? 'mutual' : iMine ? 'mine' : 'none')
      setBookmarked(!!bookmarkRes.data)

      if (!iMine) {
        const myTargetIds = (myMutualsRes.data ?? []).map(s => s.target_user_id)
        if (myTargetIds.length > 0) {
          const { data: theyStockedBack } = await supabase
            .from('stocks')
            .select('user_id')
            .eq('target_user_id', userId!)
            .in('user_id', myTargetIds)
          setSlotsFull((theyStockedBack ?? []).length >= 5)
        }
      }
    }
    loadStock()
  }, [userId, otherUserId])

  // ── ストック操作 ─────────────────────────────────────────────────
  async function handleStockToggle() {
    if (stocking || !userId || !otherUserId) return
    setStocking(true)
    if (stockStatus === 'none' && !slotsFull) {
      await supabase.from('stocks').insert({ user_id: userId, target_user_id: otherUserId })
      setStockStatus('mine')
    } else if (stockStatus === 'none' && slotsFull && !bookmarked) {
      await supabase.from('bookmarks').insert({ user_id: userId, target_user_id: otherUserId })
      setBookmarked(true)
    } else if (stockStatus === 'none' && slotsFull && bookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', userId).eq('target_user_id', otherUserId)
      setBookmarked(false)
    }
    setStocking(false)
  }

  // ── リアクション ─────────────────────────────────────────────────
  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    if (!userId) return
    const existing = feed.find(f => f.kind === 'message' && f.id === messageId) as FeedMsg | undefined
    const already = existing?.reactions.some(r => r.emoji === emoji && r.user_id === userId)

    if (already) {
      await supabase.from('reactions').delete()
        .eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji)
    } else {
      await supabase.from('reactions').insert({ message_id: messageId, user_id: userId, emoji })
    }
  }, [userId, feed])

  // ── ローディング ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-way-base flex items-center justify-center">
        <p className="text-way-muted text-sm">…</p>
      </div>
    )
  }

  return (
    <div className="h-dvh flex flex-col bg-way-base" style={{ maxWidth: 430, margin: '0 auto' }}>

      {/* ── ヘッダー ── */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-way-wood-light shrink-0">
        <Link href="/" className="text-way-muted hover:text-way-text transition-colors text-lg">←</Link>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-way-text truncate">{otherCodename}</p>
        </div>

        {/* ストックボタン */}
        {stockStatus === 'mutual' ? (
          <Link href={`/stocks/${otherUserId}`} className="text-way-green text-lg leading-none" title="ストック済み">
            📌
          </Link>
        ) : stockStatus === 'mine' ? (
          <span className="text-base leading-none opacity-50" title="相手のストック待ち">🔖</span>
        ) : slotsFull ? (
          <button
            onClick={handleStockToggle}
            disabled={stocking}
            className={`text-base leading-none transition-opacity ${bookmarked ? 'opacity-100' : 'opacity-40'}`}
            title={bookmarked ? '印あり' : '印をつける'}
          >🔖</button>
        ) : (
          <button
            onClick={handleStockToggle}
            disabled={stocking}
            className="w-6 h-6 rounded-full border border-way-wood text-way-muted text-xs flex items-center justify-center hover:border-way-green hover:text-way-green transition-colors"
            title="ストックする"
          >+</button>
        )}

        {/* タイマー */}
        {freed ? (
          <span className="text-xs text-way-green px-2 py-1 rounded-full border border-way-green/30 bg-way-green/5">
            自由チャット
          </span>
        ) : (
          <span
            className="text-sm font-mono font-medium px-2 py-1 rounded-full border"
            style={{
              color: timerCritical ? 'var(--way-terracotta)' : 'var(--way-muted)',
              borderColor: timerCritical ? 'var(--way-terracotta)' : 'var(--way-wood-light)',
            }}
          >
            {pad(timer.h)}:{pad(timer.m)}:{pad(timer.s)}
          </span>
        )}
      </header>

      {/* ── メッセージ一覧 ── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {feed.map(item => {
          if (item.kind === 'drink') {
            const isMine = item.sender_id === userId
            return (
              <div key={item.id} className="flex justify-center">
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-way-surface border border-way-wood-light text-sm text-way-muted">
                  <span className="text-xl">{item.item.emoji}</span>
                  <span>{isMine ? 'あなたが' : `${otherCodename}が`} {item.item.name} を送った</span>
                </div>
              </div>
            )
          }
          return (
            <MessageItem
              key={item.id}
              message={item}
              isMine={item.sender_id === userId}
              userId={userId!}
              onReact={handleReact}
            />
          )
        })}
        <div ref={bottomRef} />
      </main>

      {/* ── 入力欄 ── */}
      <footer className="px-4 py-3 border-t border-way-wood-light shrink-0 bg-way-base">
        {/* Layer 1 エラー */}
        {sendError && (
          <p className="text-xs text-way-terracotta mb-2 px-1">{sendError}</p>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => setDrinkBarOpen(v => !v)}
            className="w-10 h-10 rounded-full bg-way-wood-light border border-way-wood flex items-center justify-center text-lg shrink-0 hover:bg-way-wood transition-colors"
            aria-label="ドリンクバー"
          >🥤</button>

          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); if (sendError) setSendError(null) }}
            onKeyDown={handleKeyDown}
            placeholder="メッセージ"
            rows={1}
            className={`flex-1 px-4 py-2.5 rounded-2xl border bg-way-surface text-way-text text-sm placeholder-way-muted outline-none resize-none transition-colors ${
              sendError ? 'border-way-terracotta' : 'border-way-wood focus:border-way-green'
            }`}
            style={{ maxHeight: 120, overflowY: 'auto' }}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-full bg-way-green flex items-center justify-center text-white shrink-0 disabled:opacity-40 transition-opacity"
            aria-label="送信"
          >↑</button>
        </div>
      </footer>

      {/* ── ドリンクバー ── */}
      {drinkBarOpen && (
        <DrinkBar
          items={drinkItems}
          onSend={handleDrinkSend}
          onClose={() => setDrinkBarOpen(false)}
          sending={sending}
        />
      )}

      {/* ── 30回達成オーバーレイ ── */}
      {showFreedCelebration && (
        <FreedCelebration
          chatId={chatId}
          otherCodename={otherCodename}
          encounterNumber={chat?.encounter_number ?? 30}
          onClose={() => setShowFreedCelebration(false)}
        />
      )}
    </div>
  )
}
