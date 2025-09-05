'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useScoringAlerts } from '@/hooks/use-scoring-analytics'
import { useScoringThresholds } from '@/hooks/use-scoring-thresholds'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { AlertQuickToggle } from './alert-quick-toggle'

// Convert threshold to user-friendly level names
function thresholdToLevelName(
  warningThreshold: number,
  t: ReturnType<typeof useTranslations>,
): string {
  if (warningThreshold >= 0.8) return t('levels.urgentOnly') // Most restrictive - fewest items
  if (warningThreshold >= 0.7) return t('levels.priority') // Moderately restrictive
  if (warningThreshold >= 0.5) return t('levels.allFlagged') // Less restrictive - more items
  return t('levels.completeReview') // Least restrictive - most items
}

export function UrgentAlerts() {
  const t = useTranslations('store.urgentAlerts')
  const activeStoreId = useActiveStoreId()
  const { data, isLoading, error } = useScoringAlerts(activeStoreId)
  const { warningThreshold } = useScoringThresholds(activeStoreId || undefined)

  const isInitialLoading = isLoading
  const currentLevel = thresholdToLevelName(warningThreshold, t)

  if (isInitialLoading) {
    return (
      <div className="flex flex-col gap-4 sm:flex-row text-center sm:text-left items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-7 w-64" />
        </div>

        <Skeleton className="h-7 w-32" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 sm:flex-row text-center sm:text-left items-center justify-between">
        <div className="flex flex-col gap-2">
          <Typography variant="h4" className="font-bold text-red-600">
            {t('errors.connectionError')}
          </Typography>
          <Typography variant="p">{t('errors.unableToLoad')}</Typography>
        </div>
        <Link href="/dashboard/inventory/batches?filter=expiring">
          <Button variant="outline" className="gap-2">
            {t('buttons.viewInventory')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  const summary = data?.summary

  const getMessage = () => {
    if (!summary) return t('errors.loadingAlerts')
    const totalAlerts = summary.total_alerts

    if (totalAlerts === 0) {
      return t('messages.nothingToShow')
    }

    // For urgent mode (high threshold), use urgent language
    if (warningThreshold >= 0.8 && summary.critical_count > 0) {
      return t('messages.itemNeedsAction', { count: summary.critical_count })
    }

    // For default mode, use moderate language
    if (warningThreshold >= 0.6) {
      if (summary.critical_count > 0) {
        return t('messages.itemNeedsAction', { count: summary.critical_count })
      }
      if (summary.high_count > 0) {
        return t('messages.itemMayNeedAction', { count: summary.high_count })
      }
      return t('messages.itemsFlagged', { count: totalAlerts })
    }

    // For early warnings mode (low threshold), use gentle language
    return t('messages.itemsMonitoring', { count: totalAlerts })
  }

  const message = getMessage()

  return (
    <div className="flex flex-col gap-4 lg:flex-row text-center lg:text-left items-center justify-between">
      <div className="flex flex-col gap-2">
        <Typography variant="h4" className="font-bold">
          {currentLevel}
        </Typography>
        <Typography variant="p">{message}</Typography>
        <AlertQuickToggle
          storeId={activeStoreId || undefined}
          size="sm"
          className="mt-2 self-center lg:self-start"
        />
      </div>

      <Link href="/dashboard/inventory/batches?filter=expiring">
        <Button variant="subtleSecondary" className="gap-2">
          {t('buttons.viewItems')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  )
}
