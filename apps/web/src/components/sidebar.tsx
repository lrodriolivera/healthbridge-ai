'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FolderOpen, Server, ScrollText, Settings, LogOut, Menu, X } from 'lucide-react'
import { api } from '@/lib/api'
import { removeToken } from '@/lib/auth'

interface User {
  id: string
  email: string
  role: string
  tenant_id: string
}

const navItems = [
  { label: 'Projects', href: '/projects', icon: FolderOpen, active: true },
  { label: 'IRIS Connections', href: '/iris-connections', icon: Server, active: true },
  { label: 'Audit Log', href: '/audit-log', icon: ScrollText, active: true },
  { label: 'Settings', href: '#', icon: Settings, active: false, comingSoon: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    api.getMe().then(setUser).catch(() => {})
  }, [])

  function handleLogout() {
    removeToken()
    router.push('/login')
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
          <svg
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
            />
          </svg>
        </div>
        <span className="text-base font-semibold text-slate-900">HealthBridge AI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.active && pathname.startsWith(item.href)
            return (
              <li key={item.label}>
                {item.comingSoon ? (
                  <span className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400">
                    <item.icon className="h-5 w-5" />
                    {item.label}
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                      Soon
                    </span>
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive ? 'text-primary-600' : ''}`} />
                    {item.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-slate-200 px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
            {user?.email?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium text-slate-700">
              {user?.email || 'Loading...'}
            </p>
            <p className="text-xs text-slate-400">{user?.role || ''}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-slate-200 bg-white p-2 shadow-sm lg:hidden"
      >
        <Menu className="h-5 w-5 text-slate-600" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white transition-transform lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        {sidebarContent}
      </aside>
    </>
  )
}
