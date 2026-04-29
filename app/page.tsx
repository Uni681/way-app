'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import VoiceThrow from './_components/VoiceThrow'
import VoiceCircles from './_components/VoiceCircles'
import VoiceTimeline from './_components/VoiceTimeline'
import type { Voice, Profile } from '@/lib/types'

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeVoice, setActiveVoice] = useState<Voice | null>(null)
  const [timelineVoices, setTimelineVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, codename, avatar_url, rules_accepted_at')
        .eq('id', session.user.id)
        .single()

      if (!prof?.codename) { router.replace('/auth/setup'); return }
      if (!prof.rules_accepted_at) { router.replace('/auth/rules'); return }

      setProfile({ id: prof.id, codename: prof.codename, avatar_url: prof.avatar_url })

      // 自分の待機中の声
      const { data: myVoices } = await supabase
        .from('voices')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'waiting')
        .limit(1)

      if (myVoices?.length) setActiveVoice(myVoices[0])

      // タイムライン（他ユーザーの待機中の声）
      const { data: timeline } = await supabase
        .from('voices')
        .select('*')
        .eq('status', 'waiting')
        .neq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(30)

      setTimelineVoices(timeline ?? [])
      setLoading(false)
    }

    init()
  }, [router])

  // 自分の声がマッチしたらチャットへ遷移（Realtime）
  useEffect(() => {
    if (!activeVoice) return

    const channel = supabase
      .channel(`voice-${activeVoice.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'voices', filter: `id=eq.${activeVoice.id}` },
        (payload) => {
          const updated = payload.new as Voice
          if (updated.status === 'matched' && updated.chat_id) {
            router.push(`/chat/${updated.chat_id}`)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeVoice?.id, router])

  async function handleThrow(content: string) {
    if (!profile) return
    const { data, error } = await supabase
      .from('voices')
      .insert({ user_id: profile.id, content })
      .select()
      .single()
    if (!error && data) setActiveVoice(data)
  }

  async function handleCancel() {
    if (!activeVoice) return
    await supabase
      .from('voices')
      .update({ status: 'expired' })
      .eq('id', activeVoice.id)
    setActiveVoice(null)
  }

  async function handleReceive(voice: Voice) {
    const { data, error } = await supabase.rpc('match_voice', { p_voice_id: voice.id })

    if (error || data?.error) {
      // マッチ失敗（取られた or 自分の声）→ タイムラインから除去して終了
      setTimelineVoices(prev => prev.filter(v => v.id !== voice.id))
      return
    }

    router.push(`/chat/${data.chat_id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-way-base flex items-center justify-center">
        <p className="text-way-muted text-sm">…</p>
      </div>
    )
  }

  const circleVoices = timelineVoices.slice(0, 3)

  return (
    <div className="min-h-screen flex flex-col bg-way-base" style={{ maxWidth: 430, margin: '0 auto' }}>
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-way-wood-light">
        <h1
          className="text-2xl font-bold tracking-widest text-way-text"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          WAY
        </h1>
        <div className="w-9 h-9 rounded-full bg-way-wood-light border border-way-wood flex items-center justify-center text-way-text text-sm font-medium select-none">
          {profile?.codename?.[0] ?? '?'}
        </div>
      </header>

      {/* メイン */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* 声を受ける + 投げる エリア */}
        <section className="flex flex-col items-center justify-center gap-10 px-6 py-12 min-h-[55vh]">
          {/* 待機中でないときだけ丸を表示 */}
          {!activeVoice && circleVoices.length > 0 && (
            <VoiceCircles voices={circleVoices} onReceive={handleReceive} />
          )}
          <VoiceThrow
            activeVoice={activeVoice}
            onThrow={handleThrow}
            onCancel={handleCancel}
          />
        </section>

        {/* タイムライン */}
        <section className="border-t border-way-wood-light">
          <VoiceTimeline
            voices={timelineVoices}
            onReceive={handleReceive}
            disabled={!!activeVoice}
          />
        </section>
      </main>
    </div>
  )
}
