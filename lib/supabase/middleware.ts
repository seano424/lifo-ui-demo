// lib/supabase/middleware.ts

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { hasEnvVars } from '../utils'
import { logger } from '../utils/logger'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // If the env vars are not set, skip middleware check. You can remove this once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse
  }

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
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  let user = null
  let retryCount = 0
  const maxRetries = 0 // No retries in middleware - fail fast, let client handle it

  while (retryCount <= maxRetries) {
    try {
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        // Handle different error types appropriately
        if (error.message?.includes('refresh_token_not_found')) {
          // This is expected when tokens expire - not an error condition
          logger.queryWarn('middleware', 'Session expired, user needs to re-authenticate')
        } else if (error.message?.includes('Auth session missing')) {
          // Normal for logged-out users - don't log
        } else if (error.message?.includes('JWT')) {
          // Token format issues
          logger.queryWarn('middleware', 'Invalid token format, clearing session')
        } else if (error.message?.includes('fetch failed') && retryCount < maxRetries) {
          // Retry on transient fetch failures
          logger.queryWarn('middleware', 'Fetch failed, retrying', {
            attempt: retryCount + 1,
            maxRetries,
          })
          retryCount++
          await new Promise(resolve => setTimeout(resolve, 50)) // Fixed 50ms instead of exponential
          continue
        } else {
          // Only log unexpected errors
          logger.error('middleware', 'Unexpected auth error', error.message)
        }
        user = null
        break
      } else {
        user = data?.user || null
        break
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)

      // Retry on connection errors
      if (errorMessage.includes('fetch failed') && retryCount < maxRetries) {
        logger.queryWarn('middleware', 'Connection error, retrying', {
          attempt: retryCount + 1,
          maxRetries,
        })
        retryCount++
        await new Promise(resolve => setTimeout(resolve, 100 * 2 ** retryCount))
        continue
      }

      // Handle any unexpected errors that aren't retryable
      logger.error('middleware', 'Unexpected error getting user', errorMessage)
      user = null
      break
    }
  }

  // Allow requests with auth codes to pass through (for password reset, etc.)
  const hasAuthCode = request.nextUrl.searchParams.get('code')

  if (
    request.nextUrl.pathname !== '/' &&
    !user &&
    !hasAuthCode &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/onboarding/create-account') &&
    !request.nextUrl.pathname.startsWith('/onboarding/success') &&
    !request.nextUrl.pathname.startsWith('/contact') &&
    !request.nextUrl.pathname.startsWith('/features') &&
    !request.nextUrl.pathname.startsWith('/pricing') &&
    !request.nextUrl.pathname.startsWith('/support')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
