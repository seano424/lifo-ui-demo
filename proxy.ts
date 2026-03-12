// proxy.ts

import { updateSession } from '@/lib/supabase/proxy'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export default async function proxy(request: NextRequest) {
  const { searchParams, pathname } = new URL(request.url)
  const code = searchParams.get('code')

  // Handle OAuth callback code exchange in middleware (not route handler)
  //
  // WHY MIDDLEWARE: Route handlers have a race condition where exchangeCodeForSession()
  // resolves before @supabase/ssr's internal onAuthStateChange fires setAll(). This causes
  // the response to be sent before cookies are attached. In middleware, we can explicitly
  // wait for the setAll Promise to resolve before returning the response.
  //
  // SECURITY: This also ensures redirect path validation happens before any response is sent.
  // Square OAuth redirects back to /auth/login?success=true after the backend
  // processes the callback. Bounce authenticated users straight to the dashboard.
  if (
    pathname === '/dashboard/integrations/square/callback' &&
    searchParams.get('success') === 'true'
  ) {
    return NextResponse.redirect(new URL('/onboarding/setup?square_connected=true', request.url))
  }

  if (code && pathname === '/auth/callback') {
    const type = searchParams.get('type')
    const next = searchParams.get('next')

    // Determine redirect destination
    const redirectPath =
      type === 'recovery'
        ? '/auth/update-password'
        : next?.startsWith('/')
          ? next
          : '/onboarding/setup'

    // Create response (will have cookies set on it by setAll)
    const response = NextResponse.redirect(new URL(redirectPath, request.url))

    try {
      // Promise to track when setAll completes
      let resolveCookies: () => void = () => {}
      const cookiesPromise = new Promise<void>(resolve => {
        resolveCookies = resolve
      })

      // Create Supabase client with cookie handler
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              // Set cookies directly on the existing response object
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options)
              })
              // Signal that cookies are set
              resolveCookies()
            },
          },
        },
      )

      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        return NextResponse.redirect(new URL('/auth/error', request.url))
      }

      // Wait for setAll to fire before returning response (5s timeout as safety)
      await Promise.race([cookiesPromise, new Promise(resolve => setTimeout(resolve, 5000))])

      return response
    } catch (err) {
      console.error('[proxy] OAuth code exchange failed:', err)
      return NextResponse.redirect(new URL('/auth/error', request.url))
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
