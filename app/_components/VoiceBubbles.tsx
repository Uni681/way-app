'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Voice } from '@/lib/types'

type Visual = 'placeholder' | 'real' | 'selected' | 'dismissed'

type Slot = {
  voice: Voice | null
  visual: Visual
  animateIn: boolean
}

type Props = {
  initialVoices: Voice[]
  userId: string
  onReceive?: (voice: Voice) => Promise<void>
}

// 各スロットの浮遊アニメーション設定
const FLOATS = [
  { anim: 'way-float-a 3.2s ease-in-out infinite',        mt: 20, size: 96  },
  { anim: 'way-float-b 3.8s ease-in-out infinite 0.6s',   mt: 0,  size: 112 },
  { anim: 'way-float-c 3.5s ease-in-out infinite 1.2s',   mt: 28, size: 96  },
]

function makeSlots(voices: Voice[]): Slot[] {
  return [0, 1, 2].map(i => ({
    voice: voices[i] ?? null,
    visual: (voices[i] ? 'real' : 'placeholder') as Visual,
    animateIn: false,
  }))
}

export default function VoiceBubbles({ initialVoices, userId, onReceive }: Props) {
  const [slots, setSlots] = useState<Slot[]>(() => makeSlots(initialVoices))
  const [selecting, setSelecting] = useState(false)
  const voiceIdsRef = useRef<Set<string>>(new Set(initialVoices.map(v => v.id)))

  // Realtime: 新しい声をプレースホルダーに差し込む
  useEffect(() => {
    const channel = supabase
      .channel('bubbles-new-voices')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'voices' },
        (payload) => {
          const v = payload.new as Voice
          if (v.user_id === userId || v.status !== 'waiting') return
          if (voiceIdsRef.current.has(v.id)) return

          voiceIdsRef.current.add(v.id)

          setSlots(prev => {
            const idx = prev.findIndex(s => s.visual === 'placeholder')
            if (idx === -1) return prev
            const next = [...prev]
            next[idx] = { voice: v, visual: 'real', animateIn: true }
            return next
          })

          // アニメーション完了後にフラグ解除
          setTimeout(() => {
            setSlots(prev =>
              prev.map(s => s.voice?.id === v.id ? { ...s, animateIn: false } : s)
            )
          }, 600)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function handleSelect(idx: number) {
    const slot = slots[idx]
    if (!slot.voice || selecting || slots.some(s => s.visual === 'selected') || !onReceive) return

    setSelecting(true)

    // ビジュアルを即更新
    setSlots(prev =>
      prev.map((s, i) => ({
        ...s,
        visual: i === idx
          ? 'selected'
          : s.visual === 'real'
          ? 'dismissed'
          : s.visual,
      }))
    )

    // 選択アニメの余韻を待つ
    await new Promise(r => setTimeout(r, 480))
    await onReceive(slot.voice)
    setSelecting(false)
  }

  const anySelected = slots.some(s => s.visual === 'selected')

  return (
    <div className="flex items-start justify-center gap-4 px-4 py-2">
      {slots.map((slot, i) => {
        const { anim, mt, size } = FLOATS[i]
        const { visual, animateIn } = slot

        const isPlaceholder = visual === 'placeholder'
        const isSelected    = visual === 'selected'
        const isDismissed   = visual === 'dismissed'
        const isReal        = visual === 'real'

        /* ──── 外側ラッパー: フロートアニメ ──── */
        const wrapperStyle: React.CSSProperties = {
          marginTop: mt,
          animation: isDismissed ? 'none' : anim,
        }

        /* ──── 丸ボタン: 選択/消滅の状態遷移 ──── */
        const btnStyle: React.CSSProperties = {
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: isPlaceholder ? 'default' : 'pointer',

          // 存在してるかしてないかの瀬戸際
          filter: isSelected
            ? 'blur(0)'
            : isPlaceholder
            ? 'none'
            : 'blur(1.3px)',

          background: isPlaceholder
            ? 'rgba(237,229,212,0.22)'
            : 'rgba(253,250,244,0.82)',

          border: isPlaceholder
            ? '1.5px dashed rgba(92,110,82,0.18)'
            : 'none',

          boxShadow: isPlaceholder
            ? 'none'
            : isSelected
            ? '0 0 0 2.5px #5C6E52, 0 0 0 9px rgba(92,110,82,0.11), 0 8px 28px rgba(44,42,36,0.1)'
            : '0 0 0 1.5px rgba(92,110,82,0.16), 0 8px 24px rgba(44,42,36,0.06)',

          opacity: isDismissed ? 0 : animateIn ? 0 : 1,
          transform: isDismissed
            ? 'scale(0.72)'
            : animateIn
            ? 'scale(0.88)'
            : isSelected
            ? 'scale(1.05)'
            : 'scale(1)',

          transition: isDismissed || animateIn
            ? 'opacity 0.45s ease, transform 0.45s ease, filter 0.45s ease, box-shadow 0.45s ease'
            : 'filter 0.4s ease, box-shadow 0.4s ease, transform 0.35s ease',

          backdropFilter: (isReal || isSelected) ? 'blur(8px)' : 'none',
          pointerEvents: (isDismissed || anySelected) ? 'none' : undefined,

          // animateIn: 入場アニメ
          animation: animateIn ? 'way-bubble-in 0.55s ease forwards' : undefined,
        }

        return (
          <div key={i} style={wrapperStyle} className="flex flex-col items-center gap-2">
            <button
              onClick={() => handleSelect(i)}
              disabled={isPlaceholder || selecting || anySelected}
              style={btnStyle}
              aria-label={isPlaceholder ? '声を待っています' : '声に乗る'}
            >
              {isPlaceholder ? (
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--way-muted)',
                    animation: 'way-pulse-opacity 2.2s ease-in-out infinite',
                    textAlign: 'center',
                    lineHeight: 1.5,
                  }}
                >
                  ···
                </span>
              ) : (
                <p
                  style={{
                    fontSize: 10.5,
                    color: 'var(--way-text)',
                    textAlign: 'center',
                    padding: '0 10px',
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.55,
                  }}
                >
                  {slot.voice?.content}
                </p>
              )}
            </button>

            {/* ラベル */}
            <span
              style={{
                fontSize: 11,
                color: 'var(--way-muted)',
                opacity: isPlaceholder ? 0.5 : isDismissed ? 0 : 1,
                transition: 'opacity 0.4s',
              }}
            >
              {isPlaceholder ? 'もうすぐ来るよ' : isSelected ? '✓' : '乗る'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
