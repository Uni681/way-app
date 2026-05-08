'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { NavBellIcon, NavChatIcon, NavBookmarkIcon, NavBookIcon } from '@/app/_components/icons'

const TABS = [
  { href: '/',       label: 'ホーム',   Icon: NavBellIcon },
  { href: '/chats',  label: 'チャット', Icon: NavChatIcon },
  { href: '/stocks', label: 'ストック', Icon: NavBookmarkIcon },
  { href: '/zukan',  label: '図鑑',     Icon: NavBookIcon },
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
