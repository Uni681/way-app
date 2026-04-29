'use client'

import { useState } from 'react'
import type { Voice } from '@/lib/types'

type Props = {
  voices: Voice[]
  onReceive: (voice: Voice) => Promise<void>
  disabled: boolean
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'たった今'
  if (mins < 60) return `${mins}分前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}時間前`
  return `${Math.floor(hours / 24)}日前`
}

export default function VoiceTimeline({ voices, onReceive, disabled }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [gone, setGone] = useState<Set<string>>(new Set())

  async function handleReceive(voice: Voice) {
    if (loadingId || disabled) return
    setLoadingId(voice.id)
    await onReceive(voice)
    setGone(prev => new Set(prev).add(voice.id))
    setLoadingId(null)
  }

  const visible = voices.filter(v => !gone.has(v.id))

  return (
    <div>
      <div className="px-6 py-3 flex items-center justify-between border-b border-way-wood-light">
        <p className="text-xs font-medium text-way-muted uppercase tracking-wider">タイムライン</p>
        <p className="text-xs text-way-muted">{visible.length}件</p>
      </div>

      {visible.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-way-muted">今は誰も声を投げてない</p>
          <p className="mt-1 text-xs text-way-muted">あなたが最初に投げてみよう</p>
        </div>
      ) : (
        <ul>
          {visible.map(voice => (
            <li
              key={voice.id}
              className="px-6 py-4 flex items-start gap-4 border-b border-way-wood-light last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-way-text leading-relaxed line-clamp-2">
                  {voice.content}
                </p>
                <p className="mt-1 text-xs text-way-muted">{timeAgo(voice.created_at)}</p>
              </div>

              {disabled ? (
                <span className="flex-shrink-0 text-xs text-way-muted self-center">投げ中</span>
              ) : (
                <button
                  onClick={() => handleReceive(voice)}
                  disabled={loadingId !== null}
                  className="flex-shrink-0 self-center px-4 py-1.5 rounded-full border border-way-green text-way-green text-xs font-medium hover:bg-way-green hover:text-white transition-colors disabled:opacity-40"
                >
                  {loadingId === voice.id ? '…' : '乗る'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
