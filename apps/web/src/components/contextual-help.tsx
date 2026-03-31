'use client'

import { usePathname } from 'next/navigation'
import HelpBubble from './help-bubble'
import { helpContent } from '@/lib/help-content'

const routeMap: Record<string, keyof typeof helpContent> = {
  '/projects': 'projects',
  '/iris-connections': 'irisConnections',
  '/audit-log': 'auditLog',
  '/settings': 'settings',
  '/admin': 'admin',
}

function matchRoute(pathname: string): keyof typeof helpContent | null {
  // Exact matches first
  if (routeMap[pathname]) return routeMap[pathname]

  // Pattern matches for project sub-pages
  if (/\/projects\/[^/]+\/uploads/.test(pathname)) return 'uploads'
  if (/\/projects\/[^/]+\/components/.test(pathname)) return 'components'
  if (/\/projects\/[^/]+\/mappings/.test(pathname)) return 'mappings'
  if (/\/projects\/[^/]+\/generated/.test(pathname)) return 'generated'
  if (/\/projects\/[^/]+\/deploy/.test(pathname)) return 'deploy'
  if (/\/projects\/[^/]+\/tests/.test(pathname)) return 'tests'
  if (/\/projects\/[^/]+\/export/.test(pathname)) return 'export'
  if (/\/projects\/[^/]+$/.test(pathname)) return 'projectDetail'

  return null
}

export default function ContextualHelp() {
  const pathname = usePathname()
  const key = matchRoute(pathname)

  if (!key || !helpContent[key]) return null

  return <HelpBubble content={helpContent[key]} />
}
