'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type SubStatus = 'none' | 'active' | 'cancelled'

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justSubscribed = searchParams.get('subscribed') === '1'

  const [status, setStatus] = useState<SubStatus>('none')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth'); return }

      const { data } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', session.user.id)
        .single()

      setStatus((data?.subscription_status ?? 'none') as SubStatus)
      setLoading(false)
    }
    init()
  }, [router])

  async function handleSubscribe() {
    setWorking(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const { url, error } = await res.json()
    if (error || !url) { setWorking(false); return }
    window.location.href = url
  }

  async function handlePortal() {
    setWorking(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const { url, error } = await res.json()
    if (error || !url) { setWorking(false); return }
    window.location.href = url
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-way-muted text-sm">…</p>
      </div>
    )
  }

  return (
    <>
      <header className="flex items-center gap-3 px-4 py-3 border-b border-way-wood-light shrink-0">
        <button
          onClick={() => router.back()}
          className="text-way-muted hover:text-way-text transition-colors text-lg"
        >
          ←
        </button>
        <p className="font-medium text-way-text">設定</p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6 min-h-0">

        {justSubscribed && (
          <div className="px-4 py-3 rounded-2xl bg-way-green/10 border border-way-green/30">
            <p className="text-sm text-way-green font-medium">サブスクが有効になりました 🎉</p>
            <p className="text-xs text-way-green/80 mt-1">ドリンクバーの全アイテムが使えます</p>
          </div>
        )}

        {/* サブスク */}
        <section>
          <p className="text-xs font-medium text-way-muted uppercase tracking-wider mb-3">ドリンクバー</p>
          <div className="bg-way-surface border border-way-wood-light rounded-2xl overflow-hidden">
            <div className="px-5 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-way-text">月額サブスク</p>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  status === 'active'
                    ? 'bg-way-green/10 text-way-green border border-way-green/30'
                    : 'bg-way-wood-light text-way-muted'
                }`}>
                  {status === 'active' ? '有効' : status === 'cancelled' ? '解約済み' : '未加入'}
                </span>
              </div>

              <div className="border-t border-way-wood-light pt-4 space-y-2">
                <p className="text-xs text-way-muted">含まれるもの</p>
                <ul className="space-y-1">
                  {[
                    '😪 眠眠打破・🧃 栄養ドリンク・🫖 ほうじ茶・🥛 ホットミルク・🍺 ビール',
                    '🍧 かき氷・🍵 抹茶ラテ・🍫 ホットチョコ・🎃 魔女のスープ（季節限定）',
                  ].map((item, i) => (
                    <li key={i} className="text-xs text-way-text leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-way-wood-light pt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-way-text">¥980</span>
                  <span className="text-xs text-way-muted">/ 月</span>
                </div>
              </div>
            </div>

            {status === 'active' ? (
              <button
                onClick={handlePortal}
                disabled={working}
                className="w-full py-4 border-t border-way-wood-light text-sm text-way-muted hover:text-way-text transition-colors disabled:opacity-40"
              >
                サブスクを管理する
              </button>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={working}
                className="w-full py-4 bg-way-green text-white text-sm font-medium disabled:opacity-40"
              >
                {working ? '移動中…' : 'サブスクを始める'}
              </button>
            )}
          </div>
        </section>

        {/* アカウント */}
        <section>
          <p className="text-xs font-medium text-way-muted uppercase tracking-wider mb-3">アカウント</p>
          <div className="bg-way-surface border border-way-wood-light rounded-2xl overflow-hidden">
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.replace('/auth')
              }}
              className="w-full px-5 py-4 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </section>

      </main>
    </>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <p className="text-way-muted text-sm">…</p>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
