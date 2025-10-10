// lib/supabase/middleware.ts

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { hasEnvVars } from '../utils'
import { logger } from '../utils/logger'
import { isRetryableError } from '../utils/retry'

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

  /**
   * Retry configuration aligned with rest of codebase (lib/utils/retry.ts)
   * - 3 total attempts (initial + 2 retries)
   * - Exponential backoff: 100ms, 200ms, 400ms
   * - Jitter to prevent thundering herd
   * - Max total time: ~700ms before failing
   */
  const MAX_RETRIES = 3
  const INITIAL_DELAY_MS = 100
  const BACKOFF_MULTIPLIER = 2

  /**
   * Calculate delay with exponential backoff and jitter
   * Jitter prevents synchronized retry spikes from multiple requests
   */
  function calculateRetryDelay(attempt: number): number {
    const baseDelay = INITIAL_DELAY_MS * BACKOFF_MULTIPLIER ** (attempt - 1)
    const jitter = Math.random() * 0.3 * baseDelay // ±30% jitter
    return Math.floor(baseDelay + jitter)
  }

  let user = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        // Classify error types for appropriate handling
        const errorMsg = error.message || ''

        if (errorMsg.includes('refresh_token_not_found')) {
          // Expected: tokens expired - user needs to re-authenticate
          // Cookie clearing happens at redirect point, not here
          logger.queryWarn('middleware', 'Session expired, user needs to re-authenticate')
          user = null
          break
        }

        if (errorMsg.includes('Auth session missing')) {
          // Expected: logged-out users - silent failure
          user = null
          break
        }

        if (errorMsg.includes('JWT')) {
          // Expected: invalid/malformed token - user needs to re-authenticate
          logger.queryWarn('middleware', 'Invalid token format, user needs to re-authenticate')
          user = null
          break
        }

        // Check if error is retryable (network/transient issues)
        if (isRetryableError(error) && attempt < MAX_RETRIES) {
          const delay = calculateRetryDelay(attempt)
          logger.queryWarn('middleware', 'Retryable auth error, waiting before retry', {
            error: errorMsg,
            attempt,
            nextAttempt: attempt + 1,
            maxRetries: MAX_RETRIES,
            delayMs: delay,
          })

          await new Promise(resolve => setTimeout(resolve, delay))
          continue // Retry
        }

        // Non-retryable error or exhausted retries
        if (attempt >= MAX_RETRIES && isRetryableError(error)) {
          logger.error('middleware', 'Auth check failed after all retries', {
            error: errorMsg,
            attempts: attempt,
          })
        } else {
          logger.error('middleware', 'Non-retryable auth error', errorMsg)
        }

        user = null
        break
      }

      // Success
      user = data?.user || null
      break
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)

      // Check if this is a retryable network error
      if (isRetryableError(err) && attempt < MAX_RETRIES) {
        const delay = calculateRetryDelay(attempt)
        logger.queryWarn('middleware', 'Network error during auth check, retrying', {
          error: errorMessage,
          attempt,
          nextAttempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          delayMs: delay,
        })

        await new Promise(resolve => setTimeout(resolve, delay))
        continue // Retry
      }

      // Non-retryable error or exhausted retries
      if (attempt >= MAX_RETRIES) {
        logger.error('middleware', 'Auth check failed after all retries (exception)', {
          error: errorMessage,
          attempts: attempt,
        })
      } else {
        logger.error('middleware', 'Non-retryable exception during auth check', errorMessage)
      }

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
    // No user and not on a public page - redirect to login
    // Clear all Supabase cookies to ensure clean state for re-authentication
    request.cookies.getAll().forEach(cookie => {
      if (cookie.name.startsWith('sb-')) {
        supabaseResponse.cookies.delete(cookie.name)
      }
    })

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
