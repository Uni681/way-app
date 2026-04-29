'use client'

import { useState } from 'react'
import type { Message, Reaction } from '@/lib/types'

const REACTION_EMOJI = ['😂', '👍', '❤️', '🔥', '😮', '🥲', '😴', '👀']

type Props = {
  message: Message
  isMine: boolean
  userId: string
  onReact: (messageId: string, emoji: string) => Promise<void>
}

export default function MessageItem({ message, isMine, userId, onReact }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [reacting, setReacting] = useState(false)

  // リアクションを絵文字ごとに集計
  const reactionMap = message.reactions.reduce<Record<string, { count: number; mine: boolean }>>(
    (acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false }
      acc[r.emoji].count++
      if (r.user_id === userId) acc[r.emoji].mine = true
      return acc
    },
    {}
  )

  async function handleReact(emoji: string) {
    if (reacting) return
    setReacting(true)
    setPickerOpen(false)
    await onReact(message.id, emoji)
    setReacting(false)
  }

  return (
    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} gap-1 relative`}>
      {/* ピッカー */}
      {pickerOpen && (
        <div
          className={`absolute z-10 bottom-full mb-2 flex gap-1.5 p-2 rounded-2xl bg-way-surface border border-way-wood-light shadow-lg ${isMine ? 'right-0' : 'left-0'}`}
        >
          {REACTION_EMOJI.map(e => (
            <button
              key={e}
              onClick={() => handleReact(e)}
              className="text-xl leading-none p-1 rounded-xl hover:bg-way-wood-light transition-colors active:scale-90"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* バブル + リアクションボタン */}
      <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
        <div
          className={`max-w-[72vw] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words
            ${isMine
              ? 'bg-way-green text-white rounded-br-sm'
              : 'bg-way-surface border border-way-wood-light text-way-text rounded-bl-sm'
            }`}
          style={{ maxWidth: 280 }}
        >
          {message.content}
        </div>

        {/* リアクション追加ボタン */}
        <button
          onClick={() => setPickerOpen(v => !v)}
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
  )
}
