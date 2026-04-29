'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const RULES = [
  {
    label: '本名禁止',
    body: 'コードネームのみ。本名・SNSアカウント名は厳禁。',
  },
  {
    label: '顔写真禁止',
    body: 'プロフィール画像に自撮りや顔写真はNG。飯・風景・手書き文字など自由にどうぞ。',
  },
  {
    label: '電話禁止',
    body: '音声・ビデオ通話なし。文字だけで、脊髄で話そう。',
  },
]

export default function RulesPage() {
  const [accepted, setAccepted] = useState(false)
  const [pending, setPending] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/auth')
    })
  }, [router])

  async function handleAccept() {
    setPending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }

      await supabase
        .from('profiles')
        .update({ rules_accepted_at: new Date().toISOString() })
        .eq('id', user.id)

      router.push('/')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-way-base py-12 px-6">
      <div className="w-full max-w-sm mx-auto space-y-8">
        <div>
          <p className="text-xs text-way-muted uppercase tracking-widest">Step 2</p>
          <h1 className="mt-1 text-2xl font-bold text-way-text">WAYの掟 — 三無</h1>
          <p className="mt-2 text-sm text-way-muted leading-relaxed">
            属性を脱ぎ捨て、脊髄で会話する。<br />
            これだけ守れば、あとは自由だ。
          </p>
        </div>

        <div className="space-y-3">
          {RULES.map((rule, i) => (
            <div
              key={rule.label}
              className="p-5 rounded-2xl bg-way-surface border border-way-wood-light"
            >
              <p className="text-xs text-way-muted mb-1">0{i + 1}</p>
              <h2 className="font-bold text-way-text">{rule.label}</h2>
              <p className="mt-1 text-sm text-way-muted leading-relaxed">{rule.body}</p>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-2xl bg-way-wood-light border border-way-wood">
          <p className="text-sm text-way-text leading-relaxed">
            <strong>30回達成後はすべての掟から解放。</strong><br />
            顔を送っても、他のSNSに移ってもいい。<br />
            どうするかは2人が決める。
          </p>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
              className="w-5 h-5 rounded accent-way-green"
            />
            <span className="text-sm text-way-text">掟を理解した。WAYをはじめる。</span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!accepted || pending}
            className="w-full py-3 rounded-2xl bg-way-green text-white text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            {pending ? '...' : 'WAYへ入る'}
          </button>
        </div>
      </div>
    </div>
  )
}
