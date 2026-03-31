'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import Sidebar from '@/components/sidebar'
import ErrorBoundary from '@/components/error-boundary'
import ContextualHelp from '@/components/contextual-help'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
    } else {
      setChecked(true)
    }
  }, [router])

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <ContextualHelp />
        </div>
      </main>
    </div>
  )
}
