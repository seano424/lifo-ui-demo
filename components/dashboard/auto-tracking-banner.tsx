'use client'

import { useState, useEffect } from 'react'
import { Zap, XIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { useBatchTrackingSetup } from '@/lib/queries/batch-tracking-onboarding'

const DISMISSED_COOKIE = 'auto_tracking_banner_dismissed'

function getDismissedCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().startsWith(`${DISMISSED_COOKIE}=`))
}

function setDismissedCookie() {
  // Expire in 30 days
  const expires = new Date()
  expires.setDate(expires.getDate() + 30)
  document.cookie = `${DISMISSED_COOKIE}=1; expires=${expires.toUTCString()}; path=/`
}

export function AutoTrackingBanner() {
  const t = useTranslations('dashboard.redesign.autoTrackingBanner')
  const activeStoreId = useActiveStoreId()
  const { data: batchTrackingSetup, isLoading } = useBatchTrackingSetup(activeStoreId || '')
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(getDismissedCookie())
  }, [])

  const handleDismiss = () => {
    setDismissedCookie()
    setDismissed(true)
  }

  // Don't show while loading, if already dismissed, or if automations are already configured
  if (isLoading || dismissed || batchTrackingSetup?.config?.setup_completed) {
    return null
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm relative">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-4 justify-between w-full md:w-auto">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-lime-300/10">
            <Zap className="size-6 text-lime-500" />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-muted size-12 md:hidden"
            onClick={handleDismiss}
          >
            <XIcon className="size-6" />
          </Button>
        </div>
        <div className="flex-1 min-w-0">
          <Typography variant="h4" className="mb-0.5">
            {t('title')}
          </Typography>
          <Typography variant="p" color="muted">
            {t('description')}
          </Typography>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          className="w-full md:w-auto text-base"
          variant="lime"
          asLink
          href="/dashboard/settings/automations"
        >
          {t('cta')}
        </Button>
        <Button
          variant="subtleGray"
          onClick={handleDismiss}
          className="w-full md:w-auto hidden md:flex"
        >
          {t('dismiss')}
          <XIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
