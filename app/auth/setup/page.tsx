'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { OCCUPATIONS, MBTI_TYPES, INTERESTS } from '@/lib/tags'
import { generateRandomCodename } from '@/lib/codenames'

export default function SetupPage() {
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [codename, setCodename] = useState('')
  const [occupation, setOccupation] = useState('')
  const [mbti, setMbti] = useState('')
  const [interest1, setInterest1] = useState('')
  const [interest2, setInterest2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/auth')
    })
  }, [router])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function handleRandom() {
    setCodename(generateRandomCodename())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }

      let avatarUrl: string | null = null

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true })

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(path)
          avatarUrl = publicUrl
        }
        // アップロード失敗時はアバターなしで続行
      }

      const { error } = await supabase.from('profiles').insert({
        id: user.id,
        codename,
        avatar_url: avatarUrl,
        occupation: occupation || null,
        mbti: mbti || null,
        interest_1: interest1 || null,
        interest_2: interest2 || null,
      })

      if (error) throw error
      router.push('/auth/rules')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'エラーが発生しました'
      if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('codename')) {
        setError('このコードネームはすでに使われています。別のものを試してね。')
      } else {
        setError(msg)
      }
    } finally {
      setPending(false)
    }
  }

  const selectClass =
    'w-full px-4 py-3 rounded-2xl border border-way-wood bg-way-surface text-way-text text-sm outline-none focus:border-way-green transition-colors appearance-none cursor-pointer'
  const labelClass = 'block text-xs font-medium text-way-muted uppercase tracking-wider mb-1'

  return (
    <div className="min-h-screen bg-way-base py-12 px-6">
      <div className="w-full max-w-sm mx-auto space-y-8">
        <div>
          <p className="text-xs text-way-muted uppercase tracking-widest">Step 1</p>
          <h1 className="mt-1 text-2xl font-bold text-way-text">自分を設定する</h1>
          <p className="mt-1 text-sm text-way-muted">本名は禁止。コードネームで話そう。</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar */}
          <div>
            <label className={labelClass}>プロフィール画像（任意）</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full border-2 border-dashed border-way-wood bg-way-surface flex items-center justify-center overflow-hidden hover:border-way-green transition-colors flex-shrink-0"
              >
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="プレビュー" fill className="object-cover" />
                ) : (
                  <span className="text-2xl text-way-muted select-none">＋</span>
                )}
              </button>
              <div>
                <p className="text-sm text-way-text">飯・風景・手書きなど自由に</p>
                <p className="text-xs text-way-terracotta mt-0.5">自撮り・顔写真はNG</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Codename */}
          <div>
            <label className={labelClass}>コードネーム</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="最大10文字"
                value={codename}
                onChange={e => setCodename(e.target.value)}
                maxLength={10}
                required
                className="flex-1 px-4 py-3 rounded-2xl border border-way-wood bg-way-surface text-way-text text-sm placeholder-way-muted outline-none focus:border-way-green transition-colors"
              />
              <button
                type="button"
                onClick={handleRandom}
                className="px-4 py-3 rounded-2xl border border-way-wood bg-way-wood-light text-way-text text-sm whitespace-nowrap hover:bg-way-wood hover:text-white transition-colors"
              >
                ランダム
              </button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={labelClass}>職種</label>
            <select value={occupation} onChange={e => setOccupation(e.target.value)} className={selectClass}>
              <option value="">選ばない</option>
              {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>MBTI</label>
            <select value={mbti} onChange={e => setMbti(e.target.value)} className={selectClass}>
              <option value="">選ばない</option>
              {MBTI_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>趣味・興味 ①</label>
            <select value={interest1} onChange={e => setInterest1(e.target.value)} className={selectClass}>
              <option value="">選ばない</option>
              {INTERESTS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>趣味・興味 ②</label>
            <select value={interest2} onChange={e => setInterest2(e.target.value)} className={selectClass}>
              <option value="">選ばない</option>
              {INTERESTS.filter(i => i !== interest1).map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          {error && <p className="text-way-terracotta text-sm">{error}</p>}

          <button
            type="submit"
            disabled={pending || !codename.trim()}
            className="w-full py-3 rounded-2xl bg-way-green text-white text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            {pending ? '...' : '次へ →'}
          </button>
        </form>
      </div>
    </div>
  )
}
