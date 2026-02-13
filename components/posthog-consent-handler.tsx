'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

/**
 * Handles PostHog consent based on cookie consent banner choices.
 * PostHog is initialized in instrumentation-client.ts with opt_out_capturing_by_default: true.
 * This component listens for consent events and opts in/out accordingly.
 */
export function PostHogConsentHandler() {
  useEffect(() => {
    const handleConsentAccepted = () => {
      posthog.opt_in_capturing()
    }

    const handleConsentRevoked = () => {
      posthog.opt_out_capturing()
    }

    // Attach event listeners for consent changes
    window.addEventListener('cookieConsentAccepted', handleConsentAccepted)
    window.addEventListener('cookieConsentRevoked', handleConsentRevoked)

    return () => {
      window.removeEventListener('cookieConsentAccepted', handleConsentAccepted)
      window.removeEventListener('cookieConsentRevoked', handleConsentRevoked)
    }
  }, [])

  return null
}
