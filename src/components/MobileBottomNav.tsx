import { Link, useLocation } from 'react-router-dom'

type NavItem = {
  id: string
  label: string
  to: string
  match: (pathname: string) => boolean
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    id: 'notes',
    label: '笔记',
    to: '/notes/edit',
    match: (pathname) =>
      pathname === '/notes/edit' || pathname.startsWith('/note/'),
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    id: 'dashboard',
    label: '仪表盘',
    to: '/dashboard',
    match: (pathname) => pathname === '/dashboard',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    id: 'graph',
    label: '图谱',
    to: '/graph',
    match: (pathname) => pathname === '/graph',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="6" cy="6" r="3" />
        <path strokeLinecap="round" d="M8.2 16.8l7.6-7.6M8.2 7.2l3 3M16.8 16.8l-3-3" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: '搜索',
    to: '/search',
    match: (pathname) => pathname === '/search',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: '设置',
    to: '/settings',
    match: (pathname) =>
      pathname === '/settings' || pathname === '/trash',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
]

export default function MobileBottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95 md:hidden"
      aria-label="主导航"
    >
      <ul className="flex items-stretch justify-around">
        {navItems.map((item) => {
          const active = item.match(pathname)
          return (
            <li key={item.id} className="flex-1">
              <Link
                to={item.to}
                className={`touch-target flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-xs transition-colors ${
                  active
                    ? 'font-medium text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
