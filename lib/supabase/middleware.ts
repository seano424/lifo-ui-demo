// lib/supabase/middleware.ts

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { logger } from '../utils/logger'
import type { User } from '@supabase/supabase-js'

const AUTH_CACHE = new Map<string, { user: User | null; expiresAt: number }>()
const AUTH_CACHE_TTL = 60000 // 1 minute
const MAX_CACHE_SIZE = 1000

const SUPABASE_PROJECT_ID =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ||
  'jrgmetdsohowtxickqij'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const sessionToken = request.cookies.get(`sb-${SUPABASE_PROJECT_ID}-auth-token`)?.value
  const cacheKey = sessionToken ? `auth_${sessionToken.slice(-16)}` : null

  // Check cache
  if (cacheKey) {
    const cached = AUTH_CACHE.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      logger.query('middleware', 'Auth cache hit')
      const user = cached.user
      if (!user && !isPublicRoute(request)) {
        return redirectToLogin(request, supabaseResponse)
      }
      return supabaseResponse
    }
  }

  logger.query('middleware', 'Auth cache miss')

  let user = null
  let networkError = false

  // Try twice with 300ms delay
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      // Suppress ECONNRESET errors during auth check since we handle them gracefully
      const originalConsoleError = console.error
      let authResult: Awaited<ReturnType<typeof supabase.auth.getUser>>

      try {
        console.error = (message, ...args) => {
          // Suppress fetch failed / ECONNRESET errors - we handle these gracefully
          const msg = String(message)
          if (
            msg.includes('ECONNRESET') ||
            msg.includes('fetch failed') ||
            (args[0] && String(args[0]).includes('ECONNRESET'))
          ) {
            return
          }
          originalConsoleError(message, ...args)
        }

        authResult = await supabase.auth.getUser()
      } finally {
        console.error = originalConsoleError
      }

      const { data, error } = authResult

      if (error) {
        const errorMsg = error.message || ''

        // Auth errors - don't retry
        if (
          errorMsg.includes('refresh_token_not_found') ||
          errorMsg.includes('Auth session missing') ||
          errorMsg.includes('JWT')
        ) {
          if (cacheKey) AUTH_CACHE.delete(cacheKey)
          user = null
          networkError = false
          break
        }

        // Network error - retry once
        networkError = true
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      } else {
        user = data?.user || null
        networkError = false

        if (cacheKey && user) {
          AUTH_CACHE.set(cacheKey, {
            user,
            expiresAt: Date.now() + AUTH_CACHE_TTL,
          })

          if (AUTH_CACHE.size > MAX_CACHE_SIZE) {
            const now = Date.now()
            for (const [key, value] of AUTH_CACHE.entries()) {
              if (value.expiresAt < now) AUTH_CACHE.delete(key)
            }
          }
        }
        break
      }
    } catch (err) {
      // Handle connection errors (EPIPE, ECONNRESET, etc.)
      const errorMessage = err instanceof Error ? err.message : String(err)

      // Connection aborted/closed - silently handle, don't retry
      if (
        errorMessage.includes('EPIPE') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ECONNABORTED') ||
        errorMessage.includes('connection closed') ||
        errorMessage.includes('fetch failed')
      ) {
        // Only log on first attempt to reduce noise
        if (attempt === 1) {
          logger.query('middleware', 'Connection closed during auth check (handled gracefully)')
        }
        networkError = false // Don't treat as network error
        user = null
        break // Exit retry loop
      }

      // Other network errors - retry once
      networkError = true
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }
  }

  // Handle result
  if (!user && !isPublicRoute(request)) {
    // If network error, let request through (don't redirect)
    if (networkError) {
      logger.queryWarn('middleware', 'Network error - letting request through')
      return supabaseResponse
    }
    // Real auth failure - redirect
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
    pathname.startsWith('/features') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/support') ||
    request.nextUrl.searchParams.has('code')
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
