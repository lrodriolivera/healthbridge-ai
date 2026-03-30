import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const API_BACKEND = process.env.API_URL || 'http://localhost:8001'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Proxy /api/* requests to the backend
  if (pathname.startsWith('/api/')) {
    const url = new URL(pathname + request.nextUrl.search, API_BACKEND)

    const headers = new Headers(request.headers)
    headers.delete('host')

    return NextResponse.rewrite(url, {
      request: { headers },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
