'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingCart, Settings } from 'lucide-react'

const links = [
  { href: '/',               label: 'Home',     Icon: LayoutDashboard },
  { href: '/shopping-list',  label: 'Shopping', Icon: ShoppingCart },
  { href: '/settings',       label: 'Settings', Icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()

  const isActive = (href) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {links.map(link => {
          const active = isActive(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              data-active={active}
              className={`
                flex flex-col items-center gap-1 px-6 py-1 rounded-lg
                text-xs font-medium transition-colors
                ${active ? 'text-green-600' : 'text-zinc-400'}
              `}
            >
              <link.Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <span>{link.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
