import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { logger } from '@/lib/utils/logger'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { searchParams, pathname } = new URL(request.url)
  const code = searchParams.get('code')

  // Handle auth code exchange for password resets and other auth flows
  if (code && pathname === '/') {
    // Create response object for proper cookie management
    let response = NextResponse.next({ request })

    // Create Supabase client with proper cookie handling for code exchange
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Set cookies on request for downstream handlers
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            // Create new response with updated cookies
            response = NextResponse.next({ request })
            // Set cookies on response to send back to client
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            )
          },
        },
      },
    )

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        const errorMessage = error.message || ''
        logger.error('middleware', 'Code exchange failed', {
          error: errorMessage,
          code: error.name,
        })

        // Provide specific error context
        const errorUrl = new URL('/auth/error', request.url)
        if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
          errorUrl.searchParams.set('reason', 'invalid_code')
        }
        return NextResponse.redirect(errorUrl)
      }

      // Code exchange successful - determine redirect destination
      const type = searchParams.get('type')
      const next = searchParams.get('next')

      let redirectUrl: URL
      if (type === 'recovery') {
        // Password reset - redirect to update password page
        redirectUrl = new URL('/auth/update-password', request.url)
      } else if (next) {
        // Use next parameter if provided
        redirectUrl = new URL(next, request.url)
      } else {
        // Default redirect
        redirectUrl = new URL('/dashboard', request.url)
      }

      // Return redirect with session cookies set
      return NextResponse.redirect(redirectUrl)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('middleware', 'Unexpected error during code exchange', {
        error: errorMessage,
      })

      // Redirect to error page
      const errorUrl = new URL('/auth/error', request.url)
      return NextResponse.redirect(errorUrl)
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js (service worker)
     * - manifest.json (PWA manifest)
     * - icon-*.png (PWA icons)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|icon-.*\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
