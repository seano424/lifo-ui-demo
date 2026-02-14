// app/(auth)/auth/callback/route.ts

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const type = searchParams.get('type')

  if (code) {
    try {
      // Use the server utility which properly handles cookies via await cookies()
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        logger.error('callback', 'Code exchange failed', {
          error: error.message,
          code: error.name,
        })
        const errorUrl = new URL('/auth/error', origin)
        if (error.message?.includes('expired') || error.message?.includes('invalid')) {
          errorUrl.searchParams.set('reason', 'invalid_code')
        }
        return NextResponse.redirect(errorUrl)
      }

      // Determine redirect destination
      let redirectPath = next
      if (type === 'recovery') {
        redirectPath = '/auth/update-password'
      }

      // Ensure redirect path is safe
      if (!redirectPath.startsWith('/')) {
        redirectPath = '/dashboard'
      }

      const isLocalEnv = process.env.NODE_ENV === 'development'
      const forwardedHost = request.headers.get('x-forwarded-host')

      // Cookies are automatically attached to the response by the cookies() API
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectPath}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
      }
      return NextResponse.redirect(`${origin}${redirectPath}`)
    } catch (error) {
      logger.error('callback', 'Unexpected error during code exchange', {
        error: error instanceof Error ? error.message : String(error),
      })
      return NextResponse.redirect(new URL('/auth/error', origin))
    }
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', origin))
}
