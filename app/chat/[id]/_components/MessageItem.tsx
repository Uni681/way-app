'use client'

import { useRef, useState } from 'react'
import type { Message } from '@/lib/types'

const REACTION_EMOJI = ['😂', '👍', '❤️', '🔥', '😮', '🥲', '😴', '👀']

// ピッカーの概算サイズ
const PICKER_H = 52
const PICKER_W = 304 // 8emoji × 38px
const HEADER_H = 56
const FOOTER_H = 72
const SCREEN_MARGIN = 8

type PickerPos = { top: number; left?: number; right?: number }

type Props = {
  message: Message
  isMine: boolean
  userId: string
  onReact: (messageId: string, emoji: string) => Promise<void>
}

export default function MessageItem({ message, isMine, userId, onReact }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pickerPos, setPickerPos] = useState<PickerPos | null>(null)
  const [reacting, setReacting] = useState(false)

  const reactionMap = message.reactions.reduce<Record<string, { count: number; mine: boolean }>>(
    (acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false }
      acc[r.emoji].count++
      if (r.user_id === userId) acc[r.emoji].mine = true
      return acc
    },
    {}
  )

  function openPicker() {
    const btn = btnRef.current
    if (!btn) return

    const rect = btn.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth

    // 上に十分スペースがあれば上、なければ下
    const spaceAbove = rect.top - HEADER_H
    const top = spaceAbove >= PICKER_H + SCREEN_MARGIN
      ? rect.top - PICKER_H - SCREEN_MARGIN
      : Math.min(rect.bottom + SCREEN_MARGIN, vh - FOOTER_H - PICKER_H - SCREEN_MARGIN)

    // 横位置: isMine は右寄せ、相手は左寄せ、はみ出たら反転
    let pos: PickerPos = { top }
    if (isMine) {
      const rightGap = vw - rect.right
      if (rightGap + PICKER_W <= vw - SCREEN_MARGIN) {
        pos.right = Math.max(rightGap, SCREEN_MARGIN)
      } else {
        pos.left = SCREEN_MARGIN
      }
    } else {
      const leftStart = rect.left
      if (leftStart + PICKER_W <= vw - SCREEN_MARGIN) {
        pos.left = Math.max(leftStart, SCREEN_MARGIN)
      } else {
        pos.right = SCREEN_MARGIN
      }
    }

    setPickerPos(pos)
  }

  function togglePicker() {
    if (pickerPos) {
      setPickerPos(null)
    } else {
      openPicker()
    }
  }

  async function handleReact(emoji: string) {
    if (reacting) return
    setReacting(true)
    setPickerPos(null)
    await onReact(message.id, emoji)
    setReacting(false)
  }

  return (
    <>
      {/* ── ピッカー（fixed で常に画面内） ── */}
      {pickerPos && (
        <>
          {/* 背景クリックで閉じる */}
          <div className="fixed inset-0 z-40" onClick={() => setPickerPos(null)} />
          <div
            className="fixed z-50 flex gap-1 p-2 rounded-2xl bg-way-surface border border-way-wood-light shadow-xl"
            style={{
              top: pickerPos.top,
              left: pickerPos.left,
              right: pickerPos.right,
            }}
          >
            {REACTION_EMOJI.map(e => (
              <button
                key={e}
                onClick={() => handleReact(e)}
                className="text-xl leading-none p-1.5 rounded-xl hover:bg-way-wood-light transition-colors active:scale-90"
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── メッセージ本体 ── */}
      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} gap-1`}>
        <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words
              ${isMine
                ? 'bg-way-green text-white rounded-br-sm'
                : 'bg-way-surface border border-way-wood-light text-way-text rounded-bl-sm'
              }`}
            style={{ maxWidth: 260 }}
          >
            {message.content}
          </div>

          {/* リアクション追加ボタン */}
          <button
            ref={btnRef}
            onClick={togglePicker}
            className="w-6 h-6 rounded-full bg-way-wood-light text-way-muted text-xs flex items-center justify-center hover:bg-way-wood transition-colors mb-1 shrink-0"
            aria-label="リアクションを追加"
          >
            +
          </button>
        </div>

        {/* リアクション表示 */}
        {Object.keys(reactionMap).length > 0 && (
          <div className={`flex gap-1 flex-wrap ${isMine ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactionMap).map(([emoji, { count, mine }]) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border transition-colors
                  ${mine
                    ? 'bg-way-green/10 border-way-green text-way-green'
                    : 'bg-way-surface border-way-wood-light text-way-muted hover:border-way-green'
                  }`}
              >
                <span>{emoji}</span>
                <span>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
