'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useScoringAlerts } from '@/hooks/use-scoring-analytics'
import { useScoringThresholds } from '@/hooks/use-scoring-thresholds'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { AlertQuickToggle } from './alert-quick-toggle'

// Convert threshold to user-friendly level names
function thresholdToLevelName(warningThreshold: number): string {
  if (warningThreshold >= 0.8) return 'Urgent Items Only' // Most restrictive - fewest items
  if (warningThreshold >= 0.7) return 'Priority Items' // Moderately restrictive
  if (warningThreshold >= 0.5) return 'All Flagged Items' // Less restrictive - more items
  return 'Complete Review' // Least restrictive - most items
}

export function UrgentAlerts() {
  const activeStoreId = useActiveStoreId()
  const { data, isLoading, error } = useScoringAlerts(activeStoreId)
  const { warningThreshold } = useScoringThresholds(activeStoreId || undefined)

  console.log('data from urgent alerts', data)

  const isInitialLoading = isLoading
  const currentLevel = thresholdToLevelName(warningThreshold)

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
          <Typography
            variant="h4"
            className="font-bold text-red-600"
          >
            Connection Error
          </Typography>
          <Typography variant="p">
            Unable to load inventory alerts. Please try again.
          </Typography>
        </div>
        <Link href="/dashboard/inventory/batches?filter=expiring">
          <Button
            variant="outline"
            className="gap-2"
          >
            View inventory
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  const summary = data?.summary

  const getMessage = () => {
    if (!summary) return 'Loading alerts...'
    const totalAlerts = summary.total_alerts

    if (totalAlerts === 0) {
      return "No items need attention right now - you're all caught up!"
    }

    // For urgent mode (high threshold), use urgent language
    if (warningThreshold >= 0.8 && summary.critical_count > 0) {
      const itemText =
        summary.critical_count === 1 ? 'item needs' : 'items need'
      return `${summary.critical_count} ${itemText} immediate action`
    }

    // For default mode, use moderate language
    if (warningThreshold >= 0.6) {
      if (summary.critical_count > 0) {
        const itemText =
          summary.critical_count === 1 ? 'item needs' : 'items need'
        return `${summary.critical_count} ${itemText} immediate action`
      }
      if (summary.high_count > 0) {
        const itemText =
          summary.high_count === 1 ? 'item may need' : 'items may need'
        return `${summary.high_count} ${itemText} attention soon`
      }
      const itemText = totalAlerts === 1 ? 'item flagged' : 'items flagged'
      return `${totalAlerts} ${itemText} for review`
    }

    // For early warnings mode (low threshold), use gentle language
    const itemText = totalAlerts === 1 ? 'item flagged' : 'items flagged'
    return `${totalAlerts} ${itemText} for monitoring`
  }

  const message = getMessage()

  return (
    <div className="flex flex-col gap-4 lg:flex-row text-center lg:text-left items-center justify-between">
      <div className="flex flex-col gap-2">
        <Typography
          variant="h4"
          className="font-bold"
        >
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
        <Button
          variant="subtleSecondary"
          className="gap-2"
        >
          View items
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  )
}
