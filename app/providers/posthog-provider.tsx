'use client'

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
      console.error('❌ PostHog: NEXT_PUBLIC_POSTHOG_KEY is not set')
      setHasError(true)
      return
    }

    if (!posthogHost) {
      console.error('❌ PostHog: NEXT_PUBLIC_POSTHOG_HOST is not set')
      setHasError(true)
      return
    }

    console.log('✅ PostHog: Initializing...', {
      posthogKey: `${posthogKey?.substring(0, 10)}...`,
      posthogHost,
    })

    try {
      // Initialize PostHog with correct configuration
      posthog.init(posthogKey, {
        api_host: posthogHost,
        autocapture: true,
        capture_pageview: false,
        capture_pageleave: false,
        loaded: _posthog => {
          console.log('✅ PostHog: Loaded successfully')
        },
      })
    } catch (error) {
      console.error('❌ PostHog: Initialization failed', error)
      setHasError(true)
      return
    }

    // Listen for cookie consent changes
    const handleConsentAccepted = () => {
      console.log('✅ PostHog: Consent accepted')
      posthog.opt_in_capturing()
    }

    const handleConsentRevoked = () => {
      console.log('✅ PostHog: Consent revoked')
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
