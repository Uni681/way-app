'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/', label: 'ホーム', icon: '🔔' },
  { href: '/stocks', label: 'ストック', icon: '🗂️' },
  { href: '/zukan', label: '図鑑', icon: '📖' },
  { href: '/settings', label: '設定', icon: '⚙️' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="flex border-t border-way-wood-light bg-way-base shrink-0">
      {TABS.map(tab => {
        const active =
          tab.href === '/'
            ? pathname === '/'
            : pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors
              ${active ? 'text-way-green' : 'text-way-muted hover:text-way-text'}`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[10px]">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
