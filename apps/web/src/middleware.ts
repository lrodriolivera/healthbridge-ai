import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Phase 0: Let client-side handle auth redirects via localStorage checks.
  // Server-side middleware cannot access localStorage, so we pass through
  // all requests and rely on the dashboard layout's useEffect guard.
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all routes except static files and API proxy
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
