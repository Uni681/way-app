'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { OCCUPATIONS, MBTI_TYPES, INTERESTS } from '@/lib/tags'
import { generateRandomCodename } from '@/lib/codenames'

type SubStatus = 'none' | 'active' | 'cancelled'
type NotifPrefs = {
  reunion_chance: boolean
  bookmark_reunion: boolean
  achievement_30: boolean
  stock_released: boolean
}

const DEFAULT_PREFS: NotifPrefs = {
  reunion_chance: false,
  bookmark_reunion: false,
  achievement_30: false,
  stock_released: false,
}

const selectClass =
  'w-full px-4 py-3 rounded-2xl border border-way-wood bg-way-surface text-way-text text-sm outline-none focus:border-way-green transition-colors appearance-none cursor-pointer'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-way-muted uppercase tracking-wider mb-3">{children}</p>
}

function ProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justSubscribed = searchParams.get('subscribed') === '1'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [working, setWorking] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // profile fields
  const [codename, setCodename] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [occupation, setOccupation] = useState('')
  const [mbti, setMbti] = useState('')
  const [interest1, setInterest1] = useState('')
  const [interest2, setInterest2] = useState('')

  // edit-mode drafts
  const [draftCodename, setDraftCodename] = useState('')
  const [draftOccupation, setDraftOccupation] = useState('')
  const [draftMbti, setDraftMbti] = useState('')
  const [draftInterest1, setDraftInterest1] = useState('')
  const [draftInterest2, setDraftInterest2] = useState('')

  // subscription
  const [subStatus, setSubStatus] = useState<SubStatus>('none')

  // notifications
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth'); return }

      const { data } = await supabase
        .from('profiles')
        .select('codename, avatar_url, occupation, mbti, interest_1, interest_2, subscription_status, notification_prefs')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setCodename(data.codename ?? '')
        setAvatarUrl(data.avatar_url ?? null)
        setOccupation(data.occupation ?? '')
        setMbti(data.mbti ?? '')
        setInterest1(data.interest_1 ?? '')
        setInterest2(data.interest_2 ?? '')
        setSubStatus((data.subscription_status ?? 'none') as SubStatus)
        setNotifPrefs({ ...DEFAULT_PREFS, ...(data.notification_prefs ?? {}) })
      }
      setLoading(false)
    }
    init()
  }, [router])

  function startEdit() {
    setDraftCodename(codename)
    setDraftOccupation(occupation)
    setDraftMbti(mbti)
    setDraftInterest1(interest1)
    setDraftInterest2(interest2)
    setAvatarFile(null)
    setAvatarPreview(null)
    setError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setAvatarFile(null)
    setAvatarPreview(null)
    setError(null)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!draftCodename.trim()) return
    setSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('not logged in')

      let newAvatarUrl = avatarUrl

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true })
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
          newAvatarUrl = publicUrl
        }
      }

      const { error: updateErr } = await supabase.from('profiles').update({
        codename: draftCodename.trim(),
        avatar_url: newAvatarUrl,
        occupation: draftOccupation || null,
        mbti: draftMbti || null,
        interest_1: draftInterest1 || null,
        interest_2: draftInterest2 || null,
      }).eq('id', user.id)

      if (updateErr) throw updateErr

      setCodename(draftCodename.trim())
      setAvatarUrl(newAvatarUrl)
      setOccupation(draftOccupation)
      setMbti(draftMbti)
      setInterest1(draftInterest1)
      setInterest2(draftInterest2)
      setEditing(false)
      setAvatarFile(null)
      setAvatarPreview(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'エラーが発生しました'
      setError(msg.includes('codename') ? 'このコードネームはすでに使われています' : msg)
    } finally {
      setSaving(false)
    }
  }

  async function toggleNotifPref(key: keyof NotifPrefs) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const next = { ...notifPrefs, [key]: !notifPrefs[key] }
    setNotifPrefs(next)
    await supabase.from('profiles').update({ notification_prefs: next }).eq('id', user.id)
  }

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

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  async function handleDeleteAccount() {
    setWorking(true)
    const res = await fetch('/api/profile/delete', { method: 'DELETE' })
    if (res.ok) {
      await supabase.auth.signOut()
      router.replace('/auth')
    } else {
      setWorking(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-way-muted text-sm">…</p>
      </div>
    )
  }

  const currentAvatar = avatarPreview ?? avatarUrl

  return (
    <>
      <header className="flex items-center gap-3 px-5 py-4 border-b border-way-wood-light shrink-0">
        <button onClick={() => router.back()} className="text-way-muted hover:text-way-text transition-colors text-lg">←</button>
        <p className="font-medium text-way-text flex-1">プロフィール</p>
        {!editing && (
          <button onClick={startEdit} className="text-sm text-way-green hover:opacity-80 transition-opacity">
            編集
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6 min-h-0">

        {justSubscribed && (
          <div className="px-4 py-3 rounded-2xl bg-way-green/10 border border-way-green/30">
            <p className="text-sm text-way-green font-medium">サブスクが有効になりました</p>
            <p className="text-xs text-way-green/80 mt-0.5">ドリンクバーの全アイテムが使えます</p>
          </div>
        )}

        {/* ── プロフィール ── */}
        <section>
          <SectionLabel>プロフィール</SectionLabel>
          <div className="bg-way-surface border border-way-wood-light rounded-2xl px-5 py-5 space-y-5">

            {/* アバター */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={!editing}
                onClick={() => editing && fileInputRef.current?.click()}
                className="relative w-16 h-16 rounded-full border-2 border-way-wood bg-way-wood-light flex items-center justify-center overflow-hidden shrink-0 disabled:cursor-default"
              >
                {currentAvatar ? (
                  <Image src={currentAvatar} alt="avatar" fill className="object-cover" />
                ) : (
                  <span className="text-2xl text-way-text font-medium select-none">{codename[0] ?? '?'}</span>
                )}
                {editing && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="text-white text-xs">変更</span>
                  </div>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

              {editing ? (
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={draftCodename}
                      onChange={e => setDraftCodename(e.target.value)}
                      maxLength={10}
                      placeholder="コードネーム"
                      className="flex-1 px-3 py-2 rounded-xl border border-way-wood bg-way-base text-way-text text-sm outline-none focus:border-way-green transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setDraftCodename(generateRandomCodename())}
                      className="px-3 py-2 rounded-xl border border-way-wood bg-way-wood-light text-way-text text-xs whitespace-nowrap hover:bg-way-wood hover:text-white transition-colors"
                    >
                      ランダム
                    </button>
                  </div>
                  <p className="text-[10px] text-way-muted">自撮り・顔写真はNG</p>
                </div>
              ) : (
                <div>
                  <p className="text-base font-medium text-way-text">{codename}</p>
                  <p className="text-xs text-way-muted mt-0.5">コードネーム</p>
                </div>
              )}
            </div>

            {/* 成分タグ */}
            {editing ? (
              <div className="space-y-3 border-t border-way-wood-light pt-4">
                <div>
                  <p className="text-[10px] text-way-muted uppercase tracking-wider mb-1">職種</p>
                  <select value={draftOccupation} onChange={e => setDraftOccupation(e.target.value)} className={selectClass}>
                    <option value="">選ばない</option>
                    {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-way-muted uppercase tracking-wider mb-1">MBTI</p>
                  <select value={draftMbti} onChange={e => setDraftMbti(e.target.value)} className={selectClass}>
                    <option value="">選ばない</option>
                    {MBTI_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-way-muted uppercase tracking-wider mb-1">趣味・興味 ①</p>
                  <select value={draftInterest1} onChange={e => setDraftInterest1(e.target.value)} className={selectClass}>
                    <option value="">選ばない</option>
                    {INTERESTS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-way-muted uppercase tracking-wider mb-1">趣味・興味 ②</p>
                  <select value={draftInterest2} onChange={e => setDraftInterest2(e.target.value)} className={selectClass}>
                    <option value="">選ばない</option>
                    {INTERESTS.filter(i => i !== draftInterest1).map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 border-t border-way-wood-light pt-4">
                {[occupation, mbti, interest1, interest2].filter(Boolean).map(tag => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-way-wood-light text-way-muted border border-way-wood/30">
                    {tag}
                  </span>
                ))}
                {![occupation, mbti, interest1, interest2].some(Boolean) && (
                  <p className="text-xs text-way-muted">成分タグ未設定</p>
                )}
              </div>
            )}

            {error && <p className="text-way-terracotta text-xs">{error}</p>}

            {editing && (
              <div className="flex gap-2 border-t border-way-wood-light pt-4">
                <button
                  onClick={cancelEdit}
                  className="flex-1 py-2.5 rounded-xl border border-way-wood text-way-muted text-sm hover:bg-way-wood-light transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !draftCodename.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-way-green text-white text-sm font-medium disabled:opacity-40 transition-opacity"
                >
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── サブスク ── */}
        <section>
          <SectionLabel>ドリンクバー</SectionLabel>
          <div className="bg-way-surface border border-way-wood-light rounded-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-way-text">月額サブスク</p>
                <p className="text-xs text-way-muted mt-0.5">全アイテム使い放題 ¥980/月</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                subStatus === 'active'
                  ? 'bg-way-green/10 text-way-green border-way-green/30'
                  : 'bg-way-wood-light text-way-muted border-transparent'
              }`}>
                {subStatus === 'active' ? 'プレミアム' : subStatus === 'cancelled' ? '解約済み' : '無料'}
              </span>
            </div>
            {subStatus === 'active' ? (
              <button
                onClick={handlePortal}
                disabled={working}
                className="w-full py-3.5 border-t border-way-wood-light text-sm text-way-muted hover:text-way-text transition-colors disabled:opacity-40"
              >
                サブスクを管理する
              </button>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={working}
                className="w-full py-3.5 bg-way-green text-white text-sm font-medium disabled:opacity-40 transition-opacity"
              >
                {working ? '移動中…' : 'サブスクを始める'}
              </button>
            )}
          </div>
        </section>

        {/* ── 通知設定 ── */}
        <section>
          <SectionLabel>通知設定</SectionLabel>
          <div className="bg-way-surface border border-way-wood-light rounded-2xl overflow-hidden divide-y divide-way-wood-light">
            <div className="px-5 py-3">
              <p className="text-xs text-way-muted">以下の通知は常にONです</p>
              {[
                '誰かが声に乗ってきた',
                '相思相愛が成立した',
                'タイマー残り1時間',
              ].map(label => (
                <div key={label} className="flex items-center justify-between mt-2">
                  <p className="text-sm text-way-text">{label}</p>
                  <span className="text-xs text-way-green font-medium">ON</span>
                </div>
              ))}
            </div>
            {([
              { key: 'reunion_chance',  label: 'ストック相手との再会チャンス' },
              { key: 'bookmark_reunion', label: '印をつけた人が来てる' },
              { key: 'achievement_30',   label: '30回達成' },
              { key: 'stock_released',   label: '相手がストックを解除した' },
            ] as { key: keyof NotifPrefs; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleNotifPref(key)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-way-wood-light transition-colors"
              >
                <p className="text-sm text-way-text text-left">{label}</p>
                <div className={`w-10 h-5.5 rounded-full relative transition-colors ${notifPrefs[key] ? 'bg-way-green' : 'bg-way-wood'}`}>
                  <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${notifPrefs[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── WAYのルール ── */}
        <section>
          <SectionLabel>WAYのルール</SectionLabel>
          <div className="bg-way-surface border border-way-wood-light rounded-2xl px-5 py-5 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-way-muted">三無の掟</p>
              {[['本名禁止', 'コードネームのみ'], ['顔写真禁止', '自撮り・顔写真NG'], ['電話禁止', '音声・ビデオ通話なし']].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-2">
                  <span className="text-way-terracotta text-sm font-medium w-20 shrink-0">{title}</span>
                  <span className="text-xs text-way-muted">{desc}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-way-wood-light pt-4 space-y-1">
              <p className="text-xs font-medium text-way-muted">即BANの対象</p>
              <p className="text-xs text-way-muted leading-relaxed">30回未満での連絡先提示・「会おう」発言・SNSへの誘導</p>
            </div>
            <div className="border-t border-way-wood-light pt-4 space-y-1">
              <p className="text-xs font-medium text-way-green">30回達成後</p>
              <p className="text-xs text-way-muted leading-relaxed">すべてのルールから解放。顔写真OK・SNS交換OK・会う約束OK。どうするかは2人が決める。</p>
            </div>
          </div>
        </section>

        {/* ── アカウント ── */}
        <section>
          <SectionLabel>アカウント</SectionLabel>
          <div className="bg-way-surface border border-way-wood-light rounded-2xl overflow-hidden divide-y divide-way-wood-light">
            <button
              onClick={handleLogout}
              className="w-full px-5 py-4 text-left text-sm text-way-text hover:bg-way-wood-light transition-colors"
            >
              ログアウト
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full px-5 py-4 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              アカウントを削除する
            </button>
          </div>
        </section>

        <div className="h-4" />
      </main>

      {/* ── 削除確認モーダル ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-way-surface rounded-3xl p-6 space-y-4">
            <p className="text-base font-medium text-way-text">本当に削除しますか？</p>
            <p className="text-sm text-way-muted leading-relaxed">
              チャット履歴・ストック・人間図鑑のデータがすべて消えます。この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-2xl border border-way-wood text-way-muted text-sm hover:bg-way-wood-light transition-colors"
              >
                やめる
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={working}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium disabled:opacity-40 transition-opacity"
              >
                {working ? '削除中…' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <p className="text-way-muted text-sm">…</p>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  )
}
