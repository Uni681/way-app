'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { OCCUPATIONS, MBTI_TYPES, INTERESTS } from '@/lib/tags'

// ── 型 ───────────────────────────────────────────────────────────

type ZukanEntry = {
  tag_type: 'occupation' | 'mbti' | 'interest'
  tag_value: string
  count: number
}

type ColorDef = { bg: string; fg: string }

// ── カラーマップ ─────────────────────────────────────────────────

// MBTI：4グループで濃淡区別
const MBTI_COLORS: Record<string, ColorDef> = {
  // NT — 紫系
  INTJ: { bg: '#3D2870', fg: '#fff' },
  INTP: { bg: '#5B3E96', fg: '#fff' },
  ENTJ: { bg: '#7A5BAE', fg: '#fff' },
  ENTP: { bg: '#9E82C4', fg: '#2C2A24' },
  // NF — 緑系
  INFJ: { bg: '#1A5C3C', fg: '#fff' },
  INFP: { bg: '#267A52', fg: '#fff' },
  ENFJ: { bg: '#3EA36C', fg: '#fff' },
  ENFP: { bg: '#68C292', fg: '#2C2A24' },
  // SJ — 水色系
  ISTJ: { bg: '#1F4F6A', fg: '#fff' },
  ISFJ: { bg: '#2F6E8F', fg: '#fff' },
  ESTJ: { bg: '#4A90AE', fg: '#fff' },
  ESFJ: { bg: '#72B4CE', fg: '#2C2A24' },
  // SP — 黄色系
  ISTP: { bg: '#8C6018', fg: '#fff' },
  ISFP: { bg: '#B07A20', fg: '#fff' },
  ESTP: { bg: '#D4992E', fg: '#fff' },
  ESFP: { bg: '#E8B84B', fg: '#2C2A24' },
  '知らない・興味ない': { bg: '#7A7568', fg: '#fff' },
}

// 職種グループ
const OCC_MEDICAL  = new Set(['医師', '看護師', '薬剤師', '保育士'])
const OCC_CREATIVE = new Set([
  'デザイナー', '編集者・ライター', 'カメラマン', 'イラストレーター',
  '音楽家', '俳優・声優', '料理人・シェフ', '美容師・スタイリスト', '建築家', 'エンジニア',
])
const OCC_BUSINESS = new Set([
  '営業', 'マーケター', '不動産', '金融・投資', '起業家',
  'フリーランス', '公務員', '弁護士', '会計士・税理士',
])
const OCC_EDU = new Set(['教師・講師', '研究者', '学生', '大学院生'])

function occupationColor(tag: string): ColorDef {
  if (OCC_MEDICAL.has(tag))  return { bg: '#4D5E45', fg: '#fff' }   // モスグリーン
  if (OCC_CREATIVE.has(tag)) return { bg: '#B85C38', fg: '#fff' }   // テラコッタ
  if (OCC_BUSINESS.has(tag)) return { bg: '#8A6E50', fg: '#fff' }   // 木目
  if (OCC_EDU.has(tag))      return { bg: '#3D7A96', fg: '#fff' }   // 水色
  return { bg: '#7A7568', fg: '#fff' }                               // グレー
}

// 趣味グループ
const INT_ENTAME    = new Set(['映画', 'アニメ', '漫画', 'ゲーム', 'お笑い・コント', '舞台・演劇'])
const INT_OUTDOOR   = new Set(['旅行', 'アウトドア・キャンプ', '登山・ハイキング', 'サーフィン・マリンスポーツ'])
const INT_KNOWLEDGE = new Set(['読書', '歴史', '哲学・思想', '心理学', '科学・テクノロジー', '経済・投資', '語学', '伝統芸能'])
const INT_SPORT     = new Set(['スポーツ（する）', 'スポーツ（見る）', '筋トレ', 'ヨガ・瞑想', 'ダンス'])

function interestColor(tag: string): ColorDef {
  if (INT_ENTAME.has(tag))    return { bg: '#6B50A0', fg: '#fff' }   // 紫
  if (INT_OUTDOOR.has(tag))   return { bg: '#2E7848', fg: '#fff' }   // 緑
  if (INT_KNOWLEDGE.has(tag)) return { bg: '#8A6E50', fg: '#fff' }   // 木目
  if (INT_SPORT.has(tag))     return { bg: '#B85C38', fg: '#fff' }   // テラコッタ
  return { bg: '#7A7568', fg: '#fff' }                               // グレー
}

function mbtiColor(tag: string): ColorDef {
  return MBTI_COLORS[tag] ?? { bg: '#7A7568', fg: '#fff' }
}

// ── バブルアニメーション定義 ─────────────────────────────────────

const BUBBLE_SIZES = [80, 64, 52] as const
const BUBBLE_ANIMS = [
  'way-float-a 3.0s ease-in-out infinite',
  'way-float-b 3.6s ease-in-out infinite',
  'way-float-c 2.8s ease-in-out infinite',
] as const

// ── Bubble コンポーネント ─────────────────────────────────────────

function Bubble({
  label,
  count,
  size,
  color,
  anim,
}: {
  label: string
  count: number
  size: number
  color: ColorDef
  anim: string
}) {
  const nameFontSize = size >= 80 ? 12 : size >= 64 ? 11 : 10
  const countFontSize = size >= 80 ? 10 : 9
  const maxTextWidth = Math.floor(size * 0.78)

  return (
    <div
      className="flex flex-col items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color.bg,
        animation: anim,
      }}
    >
      <span
        className="line-clamp-2 break-all text-center leading-tight font-medium"
        style={{ color: color.fg, fontSize: nameFontSize, maxWidth: maxTextWidth }}
      >
        {label}
      </span>
      <span
        className="mt-px"
        style={{ color: color.fg, fontSize: countFontSize, opacity: 0.6 }}
      >
        {count}
      </span>
    </div>
  )
}

// ── ZukanSection ─────────────────────────────────────────────────

function ZukanSection({
  title,
  entries,
  totalCount,
  colorFn,
}: {
  title: string
  entries: ZukanEntry[]
  totalCount: number
  colorFn: (tag: string) => ColorDef
}) {
  const [expanded, setExpanded] = useState(false)
  if (entries.length === 0) return null

  const top3 = entries.slice(0, 3)
  const rest  = entries.slice(3)

  return (
    <section>
      {/* セクションヘッダ */}
      <div className="flex items-center gap-2 mb-0.5">
        <p className="text-xs font-medium text-way-muted uppercase tracking-wider">{title}</p>
        <span className="text-xs text-way-muted">{entries.length} / {totalCount}</span>
      </div>

      {/* バブル（トップ3） */}
      <div className="flex items-end gap-5 pt-5 pb-3 overflow-visible">
        {top3.map((e, i) => (
          <Bubble
            key={e.tag_value}
            label={e.tag_value}
            count={e.count}
            size={BUBBLE_SIZES[i]}
            color={colorFn(e.tag_value)}
            anim={BUBBLE_ANIMS[i]}
          />
        ))}
      </div>

      {/* 4位以下 */}
      {rest.length > 0 && (
        <div className="mt-0.5">
          {expanded ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {rest.map(e => {
                const c = colorFn(e.tag_value)
                return (
                  <span
                    key={e.tag_value}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: c.bg, color: c.fg }}
                  >
                    {e.tag_value}
                    <span style={{ opacity: 0.6 }}>× {e.count}</span>
                  </span>
                )
              })}
              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-way-muted px-3 py-1 rounded-full border border-way-wood-light hover:border-way-wood transition-colors"
              >
                閉じる
              </button>
            </div>
          ) : (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-way-muted px-3 py-1 rounded-full border border-way-wood-light hover:border-way-wood hover:text-way-text transition-colors"
            >
              他{rest.length}件
            </button>
          )}
        </div>
      )}
    </section>
  )
}

// ── 空状態のゴーストバブル ────────────────────────────────────────

function GhostBubble({
  size,
  color,
  anim,
}: {
  size: number
  color: string
  anim: string
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px dashed ${color}`,
        backgroundColor: `${color}18`,
        animation: anim,
        flexShrink: 0,
      }}
    />
  )
}

// ── メインページ ─────────────────────────────────────────────────

export default function ZukanPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<ZukanEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('[zukan] user:', user?.id, 'authError:', authError)
      if (authError || !user) { router.replace('/auth'); return }

      const { data, error } = await supabase
        .from('zukan_entries')
        .select('tag_type, tag_value, count')
        .eq('user_id', user.id)
        .order('count', { ascending: false })

      console.log('[zukan] data:', data, 'error:', error)
      if (error) console.error('[zukan] fetch error:', error)
      setEntries((data ?? []) as ZukanEntry[])
      setLoading(false)
    }
    init()
  }, [router])

  // tag_type ごとに分離（count降順は Supabase query で保証済み）
  const occupationEntries = entries.filter(e => e.tag_type === 'occupation')
  const mbtiEntries       = entries.filter(e => e.tag_type === 'mbti')
  const interestEntries   = entries.filter(e => e.tag_type === 'interest')
  const total             = entries.length

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-way-muted text-sm">…</p>
      </div>
    )
  }

  return (
    <>
      <header className="px-4 py-3 border-b border-way-wood-light shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-way-text">人間図鑑</h2>
          {total > 0 && <span className="text-xs text-way-muted">{total}種類</span>}
        </div>
        <p className="text-xs text-way-muted mt-0.5">完走した会話から集まった成分</p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
        {total === 0 ? (
          /* ── 空の状態 ── */
          <div className="flex flex-col items-center pt-12 pb-8 gap-10">
            <div className="flex items-end gap-5">
              <GhostBubble
                size={62}
                color="#C4A882"
                anim="way-float-b 3.4s ease-in-out infinite"
              />
              <GhostBubble
                size={80}
                color="#5C6E52"
                anim="way-float-a 3.0s ease-in-out infinite"
              />
              <GhostBubble
                size={50}
                color="#C4A882"
                anim="way-float-c 3.8s ease-in-out infinite"
              />
            </div>
            <div className="text-center space-y-2">
              <p className="text-way-text text-sm font-medium">図鑑はまだ空</p>
              <p className="text-way-muted text-xs leading-relaxed">
                会話を完走すると<br />相手の成分が集まってくる
              </p>
            </div>
          </div>
        ) : (
          /* ── データあり ── */
          <div className="space-y-10">
            <ZukanSection
              title="職種"
              entries={occupationEntries}
              totalCount={OCCUPATIONS.length}
              colorFn={occupationColor}
            />
            <ZukanSection
              title="MBTI"
              entries={mbtiEntries}
              totalCount={MBTI_TYPES.length}
              colorFn={mbtiColor}
            />
            <ZukanSection
              title="趣味"
              entries={interestEntries}
              totalCount={INTERESTS.length}
              colorFn={interestColor}
            />
          </div>
        )}
      </main>
    </>
  )
}
