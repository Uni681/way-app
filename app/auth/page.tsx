'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Mode = 'login' | 'signup'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const router = useRouter()

  function switchMode() {
    setMode(m => m === 'login' ? 'signup' : 'login')
    setError(null)
    setInfo(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setPending(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.session) {
          router.push('/auth/setup')
        } else {
          setInfo('確認メールを送りました。メールを確認してからログインしてね。')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        const { data: profile } = await supabase
          .from('profiles')
          .select('codename, rules_accepted_at')
          .eq('id', data.user.id)
          .single()

        if (!profile?.codename) {
          router.push('/auth/setup')
        } else if (!profile.rules_accepted_at) {
          router.push('/auth/rules')
        } else {
          router.push('/')
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'エラーが発生しました'
      if (msg.includes('Invalid login credentials')) {
        setError('メールアドレスかパスワードが違います')
      } else if (msg.includes('Email not confirmed')) {
        setError('メールアドレスの確認が完了していません')
      } else {
        setError(msg)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-way-base">
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center">
          <h1
            className="text-6xl font-bold tracking-widest text-way-text"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            WAY
          </h1>
          <p className="mt-3 text-sm text-way-muted">脊髄で、話そう</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-3 rounded-2xl border border-way-wood bg-way-surface text-way-text text-sm placeholder-way-muted outline-none focus:border-way-green transition-colors"
          />
          <input
            type="password"
            placeholder="パスワード（8文字以上）"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className="w-full px-4 py-3 rounded-2xl border border-way-wood bg-way-surface text-way-text text-sm placeholder-way-muted outline-none focus:border-way-green transition-colors"
          />

          {error && <p className="text-way-terracotta text-sm">{error}</p>}
          {info && <p className="text-way-green text-sm">{info}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 rounded-2xl bg-way-green text-white text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            {pending ? '...' : mode === 'signup' ? 'はじめる' : 'ログイン'}
          </button>
        </form>

        <button
          type="button"
          onClick={switchMode}
          className="w-full text-center text-sm text-way-muted hover:text-way-text transition-colors"
        >
          {mode === 'login'
            ? 'はじめての方 → 登録する'
            : 'アカウントをお持ちの方 → ログイン'}
        </button>
      </div>
    </div>
  )
}
