'use client'

import { useState, useEffect } from 'react'
import { Box, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDraftBatchesSummary } from '@/hooks/use-draft-batches'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { Button } from '@/components/ui/button'
import { Typography } from '../ui/typography'

const DISMISSED_STORAGE_KEY = 'lifo_dismissed_delivery_banner'

interface DismissedState {
  count: number
  timestamp: number
}

/**
 * Get dismissed delivery banner state from localStorage
 */
function getDismissedState(): DismissedState | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(DISMISSED_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/**
 * Save dismissed delivery banner state to localStorage
 */
function setDismissedState(count: number) {
  if (typeof window === 'undefined') return

  const state: DismissedState = {
    count,
    timestamp: Date.now(),
  }

  try {
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Clear dismissed state from localStorage
 */
function clearDismissedState() {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(DISMISSED_STORAGE_KEY)
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Delivery Banner Component
 *
 * Shows a dark banner when there are draft batches needing expiry dates.
 * Can be dismissed, but reappears when new drafts are created.
 */
export function DeliveryBanner() {
  const t = useTranslations('dashboard.redesign.deliveryBanner')
  const storeId = useActiveStoreId()
  const { data: summary, isLoading } = useDraftBatchesSummary(storeId || undefined)
  const [isDismissed, setIsDismissed] = useState(false)

  const totalDrafts = summary?.total_draft_batches || 0
  const totalUnits = summary?.total_units || 0
  const productsWithDrafts = summary?.products_with_drafts || 0

  // Check if banner should be shown
  useEffect(() => {
    if (!summary || totalDrafts === 0) {
      setIsDismissed(false)
      clearDismissedState()
      return
    }

    const dismissedState = getDismissedState()

    if (dismissedState) {
      // Show banner if draft count increased since dismissal
      if (totalDrafts > dismissedState.count) {
        setIsDismissed(false)
        clearDismissedState()
      } else {
        setIsDismissed(true)
      }
    } else {
      setIsDismissed(false)
    }
  }, [summary, totalDrafts])

  const handleDismiss = () => {
    setIsDismissed(true)
    setDismissedState(totalDrafts)
  }

  // Don't show if loading, no drafts, or dismissed
  if (isLoading || totalDrafts === 0 || isDismissed) {
    return null
  }

  return (
    <div className="flex items-center justify-between rounded-2xl bg-card p-3">
      {/* Left: Icon + Message */}
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-white p-2.5">
          <Box className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <Typography variant="p" color="primary">
            {t('title', { count: totalDrafts })}
          </Typography>
          <Typography variant="p" color="muted">
            {t('description', { units: totalUnits, count: productsWithDrafts })}
          </Typography>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <Button
          asChild
          variant="white"
          asLink
          href="/dashboard/inventory/new"
          onClick={handleDismiss}
        >
          {t('cta')}
        </Button>
        <Button variant="white" size="icon" onClick={handleDismiss} aria-label={t('dismiss')}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
