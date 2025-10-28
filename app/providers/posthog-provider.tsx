'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

interface PostHogProviderProps {
  children: React.ReactNode
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    // Listen for cookie consent changes
    const handleConsentAccepted = () => {
      posthog.opt_in_capturing()
    }

    const handleConsentRevoked = () => {
      posthog.opt_out_capturing()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('cookieConsentAccepted', handleConsentAccepted)
      window.addEventListener('cookieConsentRevoked', handleConsentRevoked)

      // Check initial consent state
      const consent = localStorage.getItem('cookie-consent')
      if (consent === 'accepted') {
        posthog.opt_in_capturing()
      } else {
        posthog.opt_out_capturing()
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('cookieConsentAccepted', handleConsentAccepted)
        window.removeEventListener('cookieConsentRevoked', handleConsentRevoked)
      }
    }
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
