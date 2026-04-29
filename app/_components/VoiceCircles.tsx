'use client'

import { useState } from 'react'
import type { Voice } from '@/lib/types'

type Props = {
  voices: Voice[]
  onReceive: (voice: Voice) => Promise<void>
}

export default function VoiceCircles({ voices, onReceive }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // 常に3つ表示（足りない分はプレースホルダー）
  const circles: (Voice | null)[] = [
    voices[0] ?? null,
    voices[1] ?? null,
    voices[2] ?? null,
  ]

  async function handleSelect(voice: Voice) {
    if (pending || selected) return
    setSelected(voice.id)
    setPending(true)
    await onReceive(voice)
    setPending(false)
  }

  // 中央を少し大きく・下にずらしてフローティング感
  const sizes = [84, 96, 84]
  const offsets = [0, 12, 0]

  return (
    <div className="flex items-end justify-center gap-5">
      {circles.map((voice, i) => {
        const size = sizes[i]
        const offset = offsets[i]
        const isSelected = voice !== null && selected === voice.id
        const isDismissed = selected !== null && (voice === null || selected !== voice.id)
        const isPlaceholder = voice === null

        return (
          <div
            key={i}
            className="flex flex-col items-center gap-2"
            style={{ marginBottom: offset }}
          >
            <button
              onClick={() => voice && handleSelect(voice)}
              disabled={isPlaceholder || pending || selected !== null}
              className="rounded-full flex items-center justify-center transition-all duration-500 ease-out"
              style={{
                width: size,
                height: size,
                backgroundColor: isPlaceholder ? 'transparent' : '#FDFAF4',
                border: isPlaceholder
                  ? '2px dashed rgba(92,110,82,0.2)'
                  : isSelected
                  ? '2px solid #5C6E52'
                  : '1.5px solid rgba(92,110,82,0.3)',
                opacity: isDismissed ? 0 : isPlaceholder ? 0.35 : 1,
                transform: isDismissed ? 'scale(0.75)' : 'scale(1)',
                filter: isPlaceholder
                  ? 'none'
                  : isSelected
                  ? 'none'
                  : 'blur(0.4px)',
                boxShadow: isSelected
                  ? '0 0 0 6px rgba(92,110,82,0.12), 0 4px 16px rgba(44,42,36,0.1)'
                  : isPlaceholder
                  ? 'none'
                  : '0 4px 12px rgba(44,42,36,0.07)',
                pointerEvents: isDismissed ? 'none' : undefined,
              }}
            >
              {voice ? (
                <p
                  className="text-xs text-way-text text-center leading-relaxed"
                  style={{
                    padding: '0 10px',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {voice.content}
                </p>
              ) : (
                <span className="text-way-muted text-base select-none">···</span>
              )}
            </button>

            {voice && !isDismissed && (
              <button
                onClick={() => handleSelect(voice)}
                disabled={pending || selected !== null}
                className="text-xs text-way-muted hover:text-way-green transition-colors disabled:opacity-0"
              >
                乗る
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
