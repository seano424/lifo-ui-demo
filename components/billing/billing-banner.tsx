'use client'

import { useState, useEffect } from 'react'
import { XIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { BILLING_LIVE } from '@/lib/config/billing'

const DISMISSED_KEY = 'billing_banner_dismissed'

function getDismissed(): boolean {
  return localStorage.getItem(DISMISSED_KEY) === '1'
}

export function BillingBanner() {
  const t = useTranslations('marketing.billingBanner')
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(getDismissed())
  }, [])

  if (BILLING_LIVE || dismissed) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="px-4 py-2.5 bg-secondary">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <Typography variant="small" color="white">
          {t('message')}
        </Typography>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 size-6 text-white hover:bg-white/10"
          onClick={handleDismiss}
          aria-label={t('dismiss')}
        >
          <XIcon className="size-4" />
        </Button>
      </div>
    </div>
  )
}
