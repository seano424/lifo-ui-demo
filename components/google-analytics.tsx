'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

// Helper function to clear GA cookies
const clearGACookies = (gaId: string) => {
  const gaIdClean = gaId.replace('G-', '')

  const cookies = ['_ga', '_gid', '_gat', '_gat_gtag_' + gaIdClean]

  cookies.forEach(name => {
    // Clear for current path
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    // Clear for domain
    document.cookie =
      name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname
  })
}

export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const [hasConsent, setHasConsent] = useState(false)

  useEffect(() => {
    // Check if user has accepted cookies
    const consent = localStorage.getItem('cookie-consent')
    if (consent === 'accepted') {
      setHasConsent(true)
    }

    // Listen for consent events
    const handleConsentAccepted = () => setHasConsent(true)

    const handleConsentRevoked = () => {
      setHasConsent(false)
      if (gaId) {
        clearGACookies(gaId)
      }
      if (window.dataLayer) {
        window.dataLayer.push({ event: 'cookie_consent_revoked' })
      }
    }

    window.addEventListener('cookieConsentAccepted', handleConsentAccepted)
    window.addEventListener('cookieConsentRevoked', handleConsentRevoked)

    return () => {
      window.removeEventListener('cookieConsentAccepted', handleConsentAccepted)
      window.removeEventListener('cookieConsentRevoked', handleConsentRevoked)
    }
  }, [gaId])

  if (!gaId || !hasConsent) {
    return null
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            'anonymize_ip': true
          });
        `}
      </Script>
    </>
  )
}
