'use client'

import { logger } from '@/lib/utils/logger'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, useState } from 'react'

interface PostHogProviderProps {
  children: React.ReactNode
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // Skip if already initialized or has error
    if (isInitialized || hasError) return

    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'

    if (!posthogKey) {
      logger.error('PostHog', 'NEXT_PUBLIC_POSTHOG_KEY is not set')
      setHasError(true)
      return
    }

    if (!posthogHost) {
      logger.error('PostHog', 'NEXT_PUBLIC_POSTHOG_HOST is not set')
      setHasError(true)
      return
    }

    // Check consent AFTER environment variable validation
    let hasConsent = false
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem('cookie-consent')
      hasConsent = consent === 'accepted'
    }

    logger.log('PostHog', 'Initializing...', {
      posthogKey: `${posthogKey?.substring(0, 10)}...`,
      posthogHost,
      hasConsent,
    })

    // Define event handlers BEFORE attaching listeners to prevent race conditions
    const handleConsentAccepted = () => {
      logger.log('PostHog', 'Consent accepted, enabling tracking')
      // Use try-catch approach instead of accessing private property
      try {
        posthog.opt_in_capturing()
      } catch (error) {
        logger.warn('PostHog', 'Consent accepted but PostHog not yet loaded, will enable on load')
        // PostHog will automatically opt-in when loaded due to opt_out_capturing_by_default: false
      }
    }

    const handleConsentRevoked = () => {
      logger.log('PostHog', 'Consent revoked, disabling tracking')
      // Use try-catch approach instead of accessing private property
      try {
        posthog.opt_out_capturing()
      } catch (error) {
        logger.warn('PostHog', 'Consent revoked but PostHog not yet loaded, will disable on load')
        // PostHog will automatically opt-out when loaded due to opt_out_capturing_by_default: true
      }
    }

    // Attach event listeners IMMEDIATELY to prevent race conditions
    if (typeof window !== 'undefined') {
      window.addEventListener('cookieConsentAccepted', handleConsentAccepted)
      window.addEventListener('cookieConsentRevoked', handleConsentRevoked)
    }

    try {
      // Initialize PostHog with consent-aware configuration
      posthog.init(posthogKey, {
        api_host: posthogHost,
        autocapture: true,
        capture_pageview: false,
        capture_pageleave: false,
        opt_out_capturing_by_default: !hasConsent, // Start opted-out unless accepted
        loaded: _posthog => {
          logger.log('PostHog', 'Loaded successfully')
          // Check if consent state changed during initialization
          const currentConsent = localStorage.getItem('cookie-consent')
          const currentHasConsent = currentConsent === 'accepted'

          if (currentHasConsent !== hasConsent) {
            logger.log('PostHog', 'Consent state changed during initialization, updating...')
            if (currentHasConsent) {
              posthog.opt_in_capturing()
            } else {
              posthog.opt_out_capturing()
            }
          }
        },
      })
    } catch (error) {
      logger.error('PostHog', 'Initialization failed', error)
      setHasError(true)

      // Optionally report to monitoring service here
      // Example: Sentry.captureException(error, { tags: { component: 'PostHog' } })

      return
    }

    setIsInitialized(true)

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('cookieConsentAccepted', handleConsentAccepted)
        window.removeEventListener('cookieConsentRevoked', handleConsentRevoked)
      }
      // Clean up PostHog instance to prevent memory leaks
      try {
        posthog.reset()
      } catch (error) {
        logger.warn('PostHog', 'Failed to reset PostHog during cleanup', error)
      }
    }
  }, [isInitialized, hasError])

  // Only render PostHog provider after successful initialization
  if (!isInitialized || hasError) {
    return <>{children}</>
  }

  return <PHProvider client={posthog}>{children}</PHProvider>
}
