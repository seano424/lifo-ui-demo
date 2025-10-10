import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { searchParams, pathname } = new URL(request.url)
  const code = searchParams.get('code')

  // Handle auth code exchange for password resets and other auth flows
  if (code && pathname === '/') {
    const supabase = await createClient()

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        // Code exchange successful - redirect to appropriate page
        const type = searchParams.get('type')
        const next = searchParams.get('next')

        if (type === 'recovery') {
          // Password reset - redirect to update password page
          const redirectUrl = new URL('/auth/update-password', request.url)
          return NextResponse.redirect(redirectUrl)
        } else if (next) {
          // Use next parameter if provided
          const redirectUrl = new URL(next, request.url)
          return NextResponse.redirect(redirectUrl)
        } else {
          // Default redirect
          const redirectUrl = new URL('/dashboard', request.url)
          return NextResponse.redirect(redirectUrl)
        }
      }
    } catch (error) {
      console.error('Code exchange failed:', error)
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
