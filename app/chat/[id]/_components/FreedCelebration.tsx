'use client'

import { useEffect, useState } from 'react'

type Props = {
  chatId: string
  otherCodename: string
  encounterNumber: number
  onClose: () => void
}

export default function FreedCelebration({
  chatId,
  otherCodename,
  encounterNumber,
  onClose,
}: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // アニメーション用に1フレーム遅らせる
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  function handleClose() {
    localStorage.setItem(`freed_seen:${chatId}`, '1')
    onClose()
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      {/* レシート */}
      <div
        className="bg-way-surface rounded-2xl overflow-hidden shadow-2xl w-[calc(100%-48px)] max-w-[340px]"
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー部分 */}
        <div className="px-8 pt-8 pb-6">
          <p
            className="text-center font-bold tracking-[0.3em] text-way-text text-xl mb-5"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            WAY
          </p>

          <div className="border-t border-dashed border-way-wood" />

          <p className="text-center text-xs text-way-muted mt-4 mb-2 leading-relaxed tracking-wide">
            この会話が、ずっとここにある
          </p>

          <div className="border-t border-dashed border-way-wood mt-4" />

          {/* 明細 */}
          <div className="space-y-3 my-6">
            <div className="flex justify-between text-sm">
              <span className="text-way-muted">相手</span>
              <span className="font-medium text-way-text">{otherCodename}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-way-muted">再会回数</span>
              <span className="font-medium text-way-text">{encounterNumber}回目</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-way-muted">タイマー制限</span>
              <span className="font-medium text-way-green">解除 ✓</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-way-muted">自由チャット</span>
              <span className="font-medium text-way-green">開放 ✓</span>
            </div>
          </div>

          <div className="border-t border-dashed border-way-wood" />

          <p className="text-center text-[10px] text-way-muted mt-4">
            {new Date().toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <button
          onClick={handleClose}
          className="w-full py-4 bg-way-green text-white text-sm font-medium tracking-wide"
        >
          話し続ける
        </button>
      </div>
    </div>
  )
}
