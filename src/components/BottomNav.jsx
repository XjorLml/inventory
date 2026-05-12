'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/',               label: 'Home',     icon: '🏠' },
  { href: '/shopping-list',  label: 'Shopping', icon: '🛒' },
  { href: '/settings',       label: 'Settings', icon: '⚙️' },
]

export default function BottomNav() {
  const pathname = usePathname()

  // WHY startsWith for settings?
  // /settings, /settings/products all count as "Settings" active
  const isActive = (href) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`
              flex flex-col items-center gap-1 px-6 py-1 rounded-lg
              text-xs font-medium transition-colors
              ${isActive(link.href)
                ? 'text-green-600'
                : 'text-zinc-400'
              }
            `}
          >
            <span className="text-xl">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}