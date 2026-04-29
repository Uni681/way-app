'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/auth')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('codename, rules_accepted_at')
        .eq('id', session.user.id)
        .single()

      if (!profile?.codename) {
        router.replace('/auth/setup')
      } else if (!profile.rules_accepted_at) {
        router.replace('/auth/rules')
      } else {
        setReady(true)
      }
    }

    checkAuth()
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen bg-way-base flex items-center justify-center">
        <p className="text-way-muted text-sm">...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-way-base flex items-center justify-center">
      <div className="text-center">
        <h1
          className="text-6xl font-bold tracking-widest text-way-text"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          WAY
        </h1>
        <p className="mt-4 text-way-muted text-sm">ホーム画面（準備中）</p>
      </div>
    </div>
  )
}
