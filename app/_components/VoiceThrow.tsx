'use client'

import { useState } from 'react'
import type { Voice } from '@/lib/types'

type Props = {
  activeVoice: Voice | null
  onThrow: (content: string) => Promise<void>
  onCancel: () => Promise<void>
}

export default function VoiceThrow({ activeVoice, onThrow, onCancel }: Props) {
  const [composing, setComposing] = useState(false)
  const [content, setContent] = useState('')
  const [pending, setPending] = useState(false)

  async function handleThrow() {
    if (!content.trim()) return
    setPending(true)
    await onThrow(content.trim())
    setContent('')
    setComposing(false)
    setPending(false)
  }

  async function handleCancel() {
    setPending(true)
    await onCancel()
    setPending(false)
  }

  // 待機中
  if (activeVoice) {
    return (
      <div className="w-full max-w-xs flex flex-col items-center gap-3">
        <div className="w-full p-5 rounded-2xl bg-way-surface border border-way-wood-light">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-way-green animate-pulse" />
            <p className="text-xs text-way-muted uppercase tracking-wider">待機中</p>
          </div>
          <p className="text-way-text text-sm leading-relaxed">
            &ldquo;{activeVoice.content}&rdquo;
          </p>
          <button
            onClick={handleCancel}
            disabled={pending}
            className="mt-4 text-xs text-way-muted hover:text-way-terracotta transition-colors disabled:opacity-50"
          >
            取り消す
          </button>
        </div>
        <p className="text-xs text-way-muted">誰かが乗るのを待ってる…</p>
      </div>
    )
  }

  // 入力中
  if (composing) {
    return (
      <div className="w-full max-w-xs space-y-3">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="今夜の声を、投げよう"
          maxLength={200}
          rows={4}
          autoFocus
          className="w-full px-4 py-3 rounded-2xl border border-way-wood bg-way-surface text-way-text text-sm placeholder-way-muted outline-none focus:border-way-green resize-none transition-colors"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-way-muted">{content.length}/200</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setComposing(false); setContent('') }}
            className="flex-1 py-3 rounded-2xl border border-way-wood text-way-muted text-sm hover:bg-way-wood-light transition-colors"
          >
            やめる
          </button>
          <button
            onClick={handleThrow}
            disabled={!content.trim() || pending}
            className="flex-1 py-3 rounded-2xl bg-way-green text-white text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            {pending ? '…' : '投げる'}
          </button>
        </div>
      </div>
    )
  }

  // ベルボタン（待機なし）
  return (
    <button
      onClick={() => setComposing(true)}
      className="flex flex-col items-center gap-3 group"
    >
      <div className="w-20 h-20 rounded-full bg-way-green flex items-center justify-center shadow-lg group-active:scale-95 group-hover:scale-105 transition-transform duration-150">
        <span className="text-3xl select-none">🔔</span>
      </div>
      <p className="text-xs text-way-muted">押して声を投げる</p>
    </button>
  )
}
