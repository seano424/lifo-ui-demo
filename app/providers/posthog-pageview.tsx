'use client'

import { logger } from '@/lib/utils/logger'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { useEffect } from 'react'

export function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Track page views when pathname or search params change
    if (pathname) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = `${url}?${searchParams.toString()}`
      }

      logger.log('PostHog', 'Tracking page view', { url, pathname })

      try {
        posthog.capture('$pageview', {
          $current_url: url,
        })
      } catch (error) {
        logger.warn('PostHog', 'Failed to track page view', error)
      }
    }
  }, [pathname, searchParams])

  return null
}
