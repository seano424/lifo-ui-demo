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

    // Check consent BEFORE initializing PostHog
    const consent = localStorage.getItem('cookie-consent')
    const hasConsent = consent === 'accepted'

    logger.log('PostHog', 'Initializing...', {
      posthogKey: `${posthogKey?.substring(0, 10)}...`,
      posthogHost,
      hasConsent,
    })

    // Define event handlers BEFORE attaching listeners to prevent race conditions
    const handleConsentAccepted = () => {
      logger.log('PostHog', 'Consent accepted, enabling tracking')
      posthog.opt_in_capturing()
    }

    const handleConsentRevoked = () => {
      logger.log('PostHog', 'Consent revoked, disabling tracking')
      posthog.opt_out_capturing()
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
        },
      })
    } catch (error) {
      logger.error('PostHog', 'Initialization failed', error)
      setHasError(true)
      return
    }

    setIsInitialized(true)

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('cookieConsentAccepted', handleConsentAccepted)
        window.removeEventListener('cookieConsentRevoked', handleConsentRevoked)
      }
    }
  }, [isInitialized, hasError])

  // Only render PostHog provider after successful initialization
  if (!isInitialized || hasError) {
    return <>{children}</>
  }

  return <PHProvider client={posthog}>{children}</PHProvider>
}
