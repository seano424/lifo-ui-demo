// lib/supabase/proxy.ts

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and getClaims()
  // Per Supabase docs: A simple mistake could make it very hard to debug issues
  // with users being randomly logged out.

  // Use getClaims() instead of getUser() - validates JWT locally without network request
  // This avoids error logs for unauthenticated users and is faster
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  // Redirect unauthenticated users trying to access protected routes
  if (!user && !isPublicRoute(request)) {
    return redirectToLogin(request, supabaseResponse)
  }

  return supabaseResponse
}

function isPublicRoute(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname
  return (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/onboarding/create-account') ||
    pathname.startsWith('/onboarding/success') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/support') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/demo')
  )
}

function redirectToLogin(request: NextRequest, response: NextResponse): NextResponse {
  request.cookies.getAll().forEach(cookie => {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.delete(cookie.name)
    }
  })
  const url = request.nextUrl.clone()
  url.pathname = '/auth/login'
  return NextResponse.redirect(url)
}
