'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

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
      // Clear GA cookies
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
  }, [])

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
