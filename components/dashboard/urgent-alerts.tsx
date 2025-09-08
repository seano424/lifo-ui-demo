'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useStoreAnalytics } from '@/hooks/use-scoring-analytics'
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
  const { data, isLoading, error } = useStoreAnalytics(activeStoreId, '7d')
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

  const urgencyDistribution = data?.analytics?.fastapi_analytics?.urgency_distribution

  const getMessage = () => {
    if (!urgencyDistribution) return t('errors.loadingAlerts')

    const criticalCount = urgencyDistribution.critical || 0
    const highCount = urgencyDistribution.high || 0
    const mediumCount = urgencyDistribution.medium || 0
    const lowCount = urgencyDistribution.low || 0
    const totalAlerts = criticalCount + highCount + mediumCount + lowCount

    if (totalAlerts === 0) {
      return t('messages.nothingToShow')
    }

    // Build message based on selected urgency level
    const messageParts = []

    // Always include critical if present
    if (criticalCount > 0) {
      messageParts.push(`${criticalCount} critical items (expired or expiring within 24 hours)`)
    }

    // Include high priority based on threshold
    if (highCount > 0 && warningThreshold <= 0.6) {
      messageParts.push(`${highCount} high priority items (expiring within 2-3 days)`)
    }

    // Include medium priority only if threshold allows
    if (mediumCount > 0 && warningThreshold <= 0.4) {
      messageParts.push(`${mediumCount} medium priority items (expiring within a week)`)
    }

    // Include low priority only if threshold allows
    if (lowCount > 0 && warningThreshold <= 0.2) {
      messageParts.push(`${lowCount} low priority items (expiring within 2 weeks)`)
    }

    // Critical only mode (threshold 0.8)
    if (warningThreshold >= 0.8) {
      if (criticalCount > 0) {
        return `${criticalCount} critical items need immediate action (expired or expiring within 24 hours)`
      }
      if (highCount > 0) {
        return `${highCount} high priority items expiring within 2-3 days`
      }
      return 'No critical items at this time'
    }

    // High priority mode (threshold 0.6)
    if (warningThreshold >= 0.6) {
      if (messageParts.length === 0) {
        return 'No urgent items at this level'
      }
      if (messageParts.length === 1) {
        return messageParts[0]
      }
      return messageParts.join(' and ')
    }

    // Medium priority mode (threshold 0.4)
    if (warningThreshold >= 0.4) {
      if (messageParts.length === 0) {
        return 'No items requiring attention at this level'
      }
      if (messageParts.length === 1) {
        return messageParts[0]
      }
      return messageParts.join(', ')
    }

    // All priority levels (threshold 0.2)
    if (messageParts.length === 0) {
      return 'All items are in good condition'
    }
    if (messageParts.length === 1) {
      return messageParts[0]
    }
    return messageParts.join(', ')
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
