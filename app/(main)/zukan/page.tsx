'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { OCCUPATIONS, MBTI_TYPES, INTERESTS } from '@/lib/tags'

// ── 型 ───────────────────────────────────────────────────────────

type ZukanEntry = {
  tag_type: 'occupation' | 'mbti' | 'interest'
  tag_value: string
  count: number
}

type Tab = 'occupation' | 'mbti' | 'interest'

interface BallState {
  id: string
  x: number
  y: number
  r: number
  label: string
  count: number
  color: string
}

// ── カラー定義 ───────────────────────────────────────────────────

const MBTI_NT = new Set(['INTJ', 'INTP', 'ENTJ', 'ENTP'])
const MBTI_NF = new Set(['INFJ', 'INFP', 'ENFJ', 'ENFP'])
const MBTI_SJ = new Set(['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'])

function mbtiColor(tag: string): string {
  if (MBTI_NT.has(tag)) return '#8B6BAE'
  if (MBTI_NF.has(tag)) return '#4CAF82'
  if (MBTI_SJ.has(tag)) return '#5B9FBF'
  if (['ISTP', 'ISFP', 'ESTP', 'ESFP'].includes(tag)) return '#D4992E'
  return '#7A7568'
}

const OCC_MEDICAL  = new Set(['医師', '看護師', '薬剤師', '保育士'])
const OCC_CREATIVE = new Set(['デザイナー', '編集者・ライター', 'カメラマン', 'イラストレーター', '音楽家', '俳優・声優', '料理人・シェフ', '美容師・スタイリスト', '建築家', 'エンジニア'])
const OCC_BUSINESS = new Set(['営業', 'マーケター', '不動産', '金融・投資', '起業家', 'フリーランス', '公務員', '弁護士', '会計士・税理士'])
const OCC_EDU      = new Set(['教師・講師', '研究者', '学生', '大学院生'])

function occupationColor(tag: string): string {
  if (OCC_MEDICAL.has(tag))  return '#4D5E45'
  if (OCC_CREATIVE.has(tag)) return '#B85C38'
  if (OCC_BUSINESS.has(tag)) return '#8A6E50'
  if (OCC_EDU.has(tag))      return '#3D7A96'
  return '#7A7568'
}

const INT_ENTAME    = new Set(['映画', 'アニメ', '漫画', 'ゲーム', 'お笑い・コント', '舞台・演劇'])
const INT_OUTDOOR   = new Set(['旅行', 'アウトドア・キャンプ', '登山・ハイキング', 'サーフィン・マリンスポーツ'])
const INT_KNOWLEDGE = new Set(['読書', '歴史', '哲学・思想', '心理学', '科学・テクノロジー', '経済・投資', '語学', '伝統芸能'])
const INT_SPORT     = new Set(['スポーツ（する）', 'スポーツ（見る）', '筋トレ', 'ヨガ・瞑想', 'ダンス'])

function interestColor(tag: string): string {
  if (INT_ENTAME.has(tag))    return '#6B50A0'
  if (INT_OUTDOOR.has(tag))   return '#2E7848'
  if (INT_KNOWLEDGE.has(tag)) return '#8A6E50'
  if (INT_SPORT.has(tag))     return '#B85C38'
  return '#7A7568'
}

function getColor(entry: ZukanEntry): string {
  if (entry.tag_type === 'mbti')       return mbtiColor(entry.tag_value)
  if (entry.tag_type === 'occupation') return occupationColor(entry.tag_value)
  return interestColor(entry.tag_value)
}

// ── ユーティリティ ───────────────────────────────────────────────

// count → 半径(px)。最小20(直径40)〜最大60(直径120)
function countToRadius(count: number, maxCount: number): number {
  const minR = 20, maxR = 60
  if (maxCount <= 1) return (minR + maxR) / 2
  return minR + Math.sqrt((count - 1) / (maxCount - 1)) * (maxR - minR)
}

// ── Ball コンポーネント ──────────────────────────────────────────

function Ball({ x, y, r, label, count, color }: BallState) {
  const fontSize   = r >= 50 ? 11 : r >= 35 ? 10 : 9
  const countSize  = r >= 40 ? 9 : 8
  const maxW       = Math.floor(r * 1.5)

  return (
    <div
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        background: [
          'radial-gradient(circle at 33% 30%, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.10) 42%, transparent 62%)',
          color,
        ].join(', '),
        boxShadow: 'inset -3px -4px 10px rgba(0,0,0,0.28), 3px 5px 16px rgba(0,0,0,0.38)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          color: '#fff',
          fontSize,
          fontWeight: 600,
          textAlign: 'center',
          lineHeight: 1.25,
          maxWidth: maxW,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-all',
        }}
      >
        {label}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: countSize, marginTop: 1 }}>
        {count}
      </span>
    </div>
  )
}

// ── タブ定義 ─────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; total: number }[] = [
  { key: 'occupation', label: '職種',  total: OCCUPATIONS.length },
  { key: 'mbti',       label: 'MBTI',  total: MBTI_TYPES.length  },
  { key: 'interest',   label: '趣味',  total: INTERESTS.length   },
]

// ── メインページ ─────────────────────────────────────────────────

export default function ZukanPage() {
  const router = useRouter()
  const [allEntries, setAllEntries] = useState<ZukanEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<Tab>('occupation')
  const [ballStates, setBallStates] = useState<BallState[]>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef    = useRef<any>(null)
  const bodiesRef    = useRef<{ body: any; r: number; label: string; count: number; color: string; id: string }[]>([])
  const rafRef       = useRef<number>(0)
  const matterRef    = useRef<any>(null)

  // ── データ取得 ─────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) { router.replace('/auth'); return }

      const { data, error } = await supabase
        .from('zukan_entries')
        .select('tag_type, tag_value, "count"')
        .eq('user_id', user.id)
        .order('count', { ascending: false })

      if (error) console.error('[zukan] fetch error:', error)
      setAllEntries((data ?? []) as ZukanEntry[])
      setLoading(false)
    }
    init()
  }, [router])

  // ── Matter.js CDN ロード ───────────────────────────────────────

  useEffect(() => {
    if ((window as any).Matter) {
      matterRef.current = (window as any).Matter
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js'
    script.async = true
    script.onload = () => { matterRef.current = (window as any).Matter }
    document.head.appendChild(script)
    return () => { if (document.head.contains(script)) document.head.removeChild(script) }
  }, [])

  // ── 物理世界セットアップ ───────────────────────────────────────

  const setupPhysics = useCallback(() => {
    const Matter = matterRef.current
    if (!Matter || !containerRef.current) return

    const { Engine, Bodies, Composite, Body } = Matter
    const el = containerRef.current
    const W  = el.clientWidth
    const H  = el.clientHeight

    // 前のワールドを破棄
    cancelAnimationFrame(rafRef.current)
    if (engineRef.current) {
      Composite.clear(engineRef.current.world)
      Engine.clear(engineRef.current)
    }

    const entries = allEntries.filter(e => e.tag_type === tab)
    if (entries.length === 0) { setBallStates([]); return }

    const maxCount = Math.max(...entries.map(e => e.count))
    const engine   = Engine.create({ gravity: { x: 0, y: 1.8 } })
    engineRef.current = engine

    // 壁・床（静的ボディ）
    const wallOpts = { isStatic: true, restitution: 0.45, friction: 0.05 }
    Composite.add(engine.world, [
      Bodies.rectangle(W / 2, H + 25, W + 60, 50, wallOpts),  // 床
      Bodies.rectangle(-25, H / 2, 50, H * 2, wallOpts),       // 左壁
      Bodies.rectangle(W + 25, H / 2, 50, H * 2, wallOpts),    // 右壁
    ])

    // ボール生成（上から落下）
    const items: typeof bodiesRef.current = []
    entries.forEach((entry, i) => {
      const r    = countToRadius(entry.count, maxCount)
      const x    = r + 10 + Math.random() * (W - r * 2 - 20)
      const y    = -r - i * (r * 2 + 8) - Math.random() * 40
      const body = Bodies.circle(x, y, r, {
        restitution: 0.5,
        friction: 0.04,
        frictionAir: 0.008,
        density: 0.0018,
      })
      Composite.add(engine.world, body)
      items.push({ body, r, label: entry.tag_value, count: entry.count, color: getColor(entry), id: entry.tag_value })
    })
    bodiesRef.current = items

    // アニメーションループ
    let last = performance.now()
    function tick(now: number) {
      const delta = Math.min(now - last, 32)
      last = now
      Engine.update(engine, delta)
      setBallStates(items.map(it => ({
        id:    it.id,
        x:     it.body.position.x,
        y:     it.body.position.y,
        r:     it.r,
        label: it.label,
        count: it.count,
        color: it.color,
      })))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [allEntries, tab])

  // データ読み込み・タブ変更で物理世界を再構築
  useEffect(() => {
    if (loading) return
    if (matterRef.current) { setupPhysics(); return }
    // Matter.js がまだ読み込まれていない場合は待機
    const id = setInterval(() => {
      if (matterRef.current) { clearInterval(id); setupPhysics() }
    }, 50)
    return () => clearInterval(id)
  }, [loading, tab, setupPhysics])

  // アンマウント時クリーンアップ
  useEffect(() => () => { cancelAnimationFrame(rafRef.current) }, [])

  // ── タップで弾む ───────────────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const Matter = matterRef.current
    if (!Matter || !containerRef.current) return
    const { Body } = Matter

    const rect = containerRef.current.getBoundingClientRect()
    const tapX = e.clientX - rect.left
    const tapY = e.clientY - rect.top

    bodiesRef.current.forEach(({ body }) => {
      const dx   = body.position.x - tapX
      const dy   = body.position.y - tapY
      const dist = Math.sqrt(dx * dx + dy * dy) + 1
      const mag  = (0.06 * body.mass) / dist
      Body.applyForce(body, body.position, {
        x: (dx / dist) * mag,
        y: Math.min(-0.06 * body.mass, (dy / dist) * mag - 0.025 * body.mass),
      })
    })
  }, [])

  // ── ジャイロ（DeviceMotionEvent）─────────────────────────────

  useEffect(() => {
    function onMotion(e: DeviceMotionEvent) {
      if (!engineRef.current || !e.accelerationIncludingGravity) return
      const ax = e.accelerationIncludingGravity.x ?? 0
      const ay = e.accelerationIncludingGravity.y ?? 0
      engineRef.current.gravity.x = ax / 9.8
      engineRef.current.gravity.y = Math.max(0.2, -(ay / 9.8))
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [])

  // ── レンダー ───────────────────────────────────────────────────

  const tabMeta    = TABS.find(t => t.key === tab)!
  const tabEntries = allEntries.filter(e => e.tag_type === tab)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-way-muted text-sm">…</p>
      </div>
    )
  }

  return (
    <>
      {/* ヘッダー */}
      <header className="px-4 pt-3 pb-2 border-b border-way-wood-light shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-way-text">人間図鑑</h2>
          <span className="text-xs text-way-muted">
            {tabEntries.length} / {tabMeta.total}種類
          </span>
        </div>

        {/* タブ */}
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-colors ${
                tab === t.key
                  ? 'bg-way-wood text-way-base'
                  : 'text-way-muted hover:text-way-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* 物理フィールド */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden min-h-0 bg-way-base"
        onPointerDown={handlePointerDown}
      >
        {tabEntries.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="text-way-text text-sm font-medium">まだ空</p>
            <p className="text-way-muted text-xs text-center leading-relaxed">
              会話を完走すると<br />相手の成分が集まってくる
            </p>
          </div>
        ) : (
          ballStates.map(ball => <Ball key={ball.id} {...ball} />)
        )}
      </div>
    </>
  )
}
