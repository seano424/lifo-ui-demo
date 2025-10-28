'use client'

import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function CookieConsentBanner() {
  const t = useTranslations('cookieConsent')
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem('cookie-consent')
      if (!consent) {
        setShowBanner(true)
      }
    }
  }, [])

  const handleAccept = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cookie-consent', 'accepted')
      localStorage.setItem('cookie-consent-date', new Date().toISOString())
    }
    setShowBanner(false)
    // Dispatch event for Google Analytics to initialize
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cookieConsentAccepted'))
    }
  }

  const handleDecline = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cookie-consent', 'declined')
      localStorage.setItem('cookie-consent-date', new Date().toISOString())
    }
    setShowBanner(false)
  }

  const getConsentStatus = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cookie-consent')
    }
    return null
  }

  const handleRevoke = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cookie-consent')
      localStorage.removeItem('cookie-consent-date')
      window.dispatchEvent(new Event('cookieConsentRevoked'))
    }
    // Re-show the banner so user can make a new choice
    setShowBanner(true)
  }

  if (!showBanner) {
    const consent = getConsentStatus()
    // Only show manage consent button if consent was given
    if (consent === 'accepted') {
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t p-4 shadow-lg">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm">
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
