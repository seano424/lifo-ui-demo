'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { Suspense, useEffect } from 'react'

function PostHogPageviewTrackerInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Only track if consent is given
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem('cookie-consent')
      if (consent !== 'accepted') {
        return
      }

      // Track pageview
      posthog.capture('$pageview', {
        $current_url: window.location.href,
      })

      // Track pageleave on unmount
      return () => {
        posthog.capture(
          '$pageleave',
          {
            $prev_url: window.location.href,
          },
          {
            transport: 'sendBeacon', // Ensures event is sent even if tab is closed
          },
        )
      }
    }
  }, [pathname, searchParams])

  return null
}

export function PostHogPageviewTracker() {
  return (
    <Suspense fallback={null}>
      <PostHogPageviewTrackerInner />
    </Suspense>
  )
}
