'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div
      className="min-h-screen bg-way-base flex flex-col items-center justify-center px-6"
      style={{ maxWidth: 430, margin: '0 auto' }}
    >
      <div className="text-center space-y-4 w-full max-w-xs">
        <p className="text-xs text-way-muted uppercase tracking-widest">マッチ成立</p>
        <h1 className="text-2xl font-bold text-way-text">チャット開始</h1>
        <p className="text-sm text-way-muted leading-relaxed">
          チャット画面は近日実装予定です。
        </p>
        <p className="text-xs font-mono text-way-muted break-all opacity-50">{id}</p>
        <Link
          href="/"
          className="block py-3 rounded-2xl bg-way-green text-white text-sm font-medium text-center"
        >
          ← ホームへ戻る
        </Link>
      </div>
    </div>
  )
}
