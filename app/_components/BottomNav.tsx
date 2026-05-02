'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function IconBell({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2.5a5.5 5.5 0 0 0-5.5 5.5v3.25L3 13.5h14l-1.5-2.25V8A5.5 5.5 0 0 0 10 2.5z" />
      <path d="M8 13.5a2 2 0 0 0 4 0" />
    </svg>
  )
}

function IconChat({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 10c0 3.59-3.358 6.5-7.5 6.5a8.6 8.6 0 0 1-2.19-.282c-.545.277-1.8.893-3.782 1.222.245-.762.434-1.758.378-2.553C2.804 13.8 2 11.994 2 10c0-3.59 3.358-6.5 7.5-6.5S17.5 6.41 17.5 10z" />
    </svg>
  )
}

function IconBookmark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 3.5h9a1 1 0 0 1 1 1v11.25l-5-3-5 3V4.5a1 1 0 0 1 1-1z" />
    </svg>
  )
}

function IconBook({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 4.5h4A2.5 2.5 0 0 1 10 7v9.5A2.5 2.5 0 0 0 7.5 14h-4V4.5z" />
      <path d="M16.5 4.5h-4A2.5 2.5 0 0 0 10 7v9.5a2.5 2.5 0 0 1 2.5-2.5h4V4.5z" />
    </svg>
  )
}

const TABS = [
  { href: '/',       label: 'ホーム',   Icon: IconBell },
  { href: '/chats',  label: 'チャット', Icon: IconChat },
  { href: '/stocks', label: 'ストック', Icon: IconBookmark },
  { href: '/zukan',  label: '図鑑',     Icon: IconBook },
] as const

export default function BottomNav() {
  const pathname = usePathname()
  const [chatCount, setChatCount] = useState(0)

  useEffect(() => {
    let uid: string | null = null

    async function fetchCount() {
      if (!uid) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        uid = session.user.id
      }
      const { count } = await supabase
        .from('chats')
        .select('id', { count: 'exact', head: true })
        .in('status', ['active', 'freed'])
        .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
      setChatCount(count ?? 0)
    }

    fetchCount()

    const channel = supabase
      .channel('bottomnav-chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, fetchCount)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <nav className="flex border-t border-way-wood-light bg-way-base shrink-0">
      {TABS.map(({ href, label, Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
        const badge = href === '/chats' ? chatCount : 0
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors
              ${active ? 'text-way-green' : 'text-way-muted hover:text-way-text'}`}
          >
            <span className="relative">
              <Icon />
              {badge > 0 && (
                <span className="absolute -top-1 -right-2.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-way-terracotta text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </span>
            <span className="text-[10px]">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
