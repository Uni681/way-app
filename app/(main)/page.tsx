'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import VoiceBubbles from '@/app/_components/VoiceBubbles'
import VoiceThrow from '@/app/_components/VoiceThrow'
import VoiceTimeline from '@/app/_components/VoiceTimeline'
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

      const { data: myVoices } = await supabase
        .from('voices')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'waiting')
        .limit(1)

      if (myVoices?.length) setActiveVoice(myVoices[0])

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

  useEffect(() => {
    if (!activeVoice) return
    const channel = supabase
      .channel(`voice-${activeVoice.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'voices', filter: `id=eq.${activeVoice.id}` },
        (payload) => {
          const v = payload.new as Voice
          if (v.status === 'matched' && v.chat_id) router.push(`/chat/${v.chat_id}`)
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
    await supabase.from('voices').update({ status: 'expired' }).eq('id', activeVoice.id)
    setActiveVoice(null)
  }

  async function handleReceive(voice: Voice) {
    const { data, error } = await supabase.rpc('match_voice', { p_voice_id: voice.id })
    if (error || data?.error) {
      setTimelineVoices(prev => prev.filter(v => v.id !== voice.id))
      return
    }
    // チャット開始通知を投げた側に送る（fire-and-forget）
    fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId: voice.user_id,
        payload: {
          title: 'WAY',
          body: '誰かが乗ってきた',
          url: `/chat/${data.chat_id}`,
          tag: `chat-start-${data.chat_id}`,
        },
      }),
    }).catch(() => {})
    router.push(`/chat/${data.chat_id}`)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-way-muted text-sm">…</p>
      </div>
    )
  }

  const bubbleVoices = timelineVoices.slice(0, 3)

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b border-way-wood-light shrink-0">
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

      <main className="flex-1 flex flex-col overflow-y-auto min-h-0">
        <section className="flex flex-col items-center gap-8 px-4 pt-10 pb-8">
          {!activeVoice && (
            <VoiceBubbles
              initialVoices={bubbleVoices}
              userId={profile!.id}
              onReceive={handleReceive}
            />
          )}
          <VoiceThrow
            activeVoice={activeVoice}
            onThrow={handleThrow}
            onCancel={handleCancel}
          />
        </section>

        <section className="border-t border-way-wood-light">
          <VoiceTimeline
            voices={timelineVoices}
            onReceive={handleReceive}
            disabled={!!activeVoice}
          />
        </section>
      </main>
    </>
  )
}
