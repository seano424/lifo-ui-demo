'use client'

import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

export function CookieConsentBanner() {
  const t = useTranslations('cookieConsent')
  const [showBanner, setShowBanner] = useState(false)
  const [hasConsent, setHasConsent] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check if user has already made a choice
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem('cookie-consent')
      setHasConsent(consent === 'accepted')
      if (!consent) {
        setShowBanner(true)
      }
    }
    setIsMounted(true)
  }, [])

  const handleAccept = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cookie-consent', 'accepted')
    }
    setShowBanner(false)
    setHasConsent(true)
    // Dispatch event for PostHog to initialize
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cookieConsentAccepted'))
    }
  }, [])

  const handleDecline = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cookie-consent', 'declined')
    }
    setShowBanner(false)
    setHasConsent(false)
    // Dispatch event for PostHog to disable tracking
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cookieConsentRevoked'))
    }
  }, [])

  const handleRevoke = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cookie-consent')
    }
    // Re-show the banner so user can make a new choice
    setShowBanner(true)
    setHasConsent(false)

    // Dispatch event after state update using setTimeout to avoid race condition
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cookieConsentRevoked'))
      }
    }, 0)
  }, [])

  // Focus management for accessibility
  useEffect(() => {
    if (showBanner && isMounted && bannerRef.current) {
      // Focus the banner when it appears for keyboard navigation
      bannerRef.current.focus()
    }
  }, [showBanner, isMounted])

  // Keyboard event handling for accessibility
  useEffect(() => {
    if (showBanner && isMounted) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          handleDecline()
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [showBanner, isMounted, handleDecline])

  // Don't render anything until mounted to prevent hydration issues
  if (!isMounted) {
    return null
  }

  if (!showBanner) {
    // Only show manage consent button if consent was given
    if (hasConsent) {
      return (
        <div className="fixed bottom-4 right-4 z-50">
          <Button variant="outline" size="sm" onClick={handleRevoke} className="text-xs">
            {t('manageCookies')}
          </Button>
        </div>
      )
    }
    return null
  }

  return (
    <div
      ref={bannerRef}
      role="dialog"
      tabIndex={-1}
      aria-live="polite"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t p-3 sm:p-4 shadow-lg animate-in slide-in-from-bottom duration-300"
    >
      <p id="cookie-banner-title" className="sr-only">
        Cookie Consent
      </p>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <p id="cookie-banner-description" className="text-sm">
            {t('message')}{' '}
            <Link href="/privacy" className="underline hover:text-primary">
              {t('learnMore')}
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDecline}>
            {t('decline')}
          </Button>
          <Button size="sm" onClick={handleAccept}>
            {t('accept')}
          </Button>
        </div>
      </div>
    </div>
  )
}
