'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { AlertQuickToggle } from './alert-quick-toggle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useScoringAlerts } from '@/hooks/use-scoring-analytics'
import { useScoringThresholds } from '@/hooks/use-scoring-thresholds'
import { useActiveStoreId } from '@/lib/stores/store-context'

// Convert threshold to level name for user-friendly messaging
function thresholdToLevelName(warningThreshold: number): string {
  if (warningThreshold >= 0.8) return 'Conservative'
  if (warningThreshold >= 0.6) return 'Balanced'
  return 'Proactive'
}

export function UrgentAlerts() {
  const activeStoreId = useActiveStoreId()
  const { data, isLoading, isFetching, error } = useScoringAlerts(activeStoreId)
  const { isUpdating: thresholdsUpdating, warningThreshold } = useScoringThresholds(activeStoreId || undefined)
  
  // Loading state for initial load
  const isInitialLoading = isLoading
  // Loading state for message text during updates
  const isMessageUpdating = thresholdsUpdating || isFetching
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
          <Typography variant="h4" className="font-bold text-red-600">
            Alert System Error
          </Typography>
          <Typography variant="p">⚠️ Unable to load urgent alerts from AI system</Typography>
        </div>
        <Link href="/dashboard/inventory/batches?filter=expiring">
          <Button variant="outline" className="gap-2">
            View all items
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  const summary = data?.summary

  const getMessage = () => {
    if (!summary) return 'Loading alert data...'
    const totalAlerts = summary.total_alerts
    
    if (totalAlerts === 0) {
      if (currentLevel === 'Conservative') {
        return 'No critical items detected - you\'re all caught up!'
      }
      if (currentLevel === 'Balanced') {
        return 'All items are within safe thresholds - you\'re all caught up!'
      }
      return 'No early warnings found - everything looks great!'
    }
    
    if (summary.critical_count > 0) {
      const itemText = summary.critical_count === 1 ? 'item' : 'items'
      if (currentLevel === 'Conservative') {
        return `${summary.critical_count} ${itemText} expiring today need immediate action`
      }
      return `${summary.critical_count} critical ${itemText} need immediate action`
    }
    
    if (summary.high_count > 0) {
      const itemText = summary.high_count === 1 ? 'item' : 'items'
      if (currentLevel === 'Balanced') {
        return `${summary.high_count} ${itemText} need attention this week`
      }
      return `${summary.high_count} ${itemText} may need attention soon`
    }
    
    const itemText = totalAlerts === 1 ? 'item' : 'items'
    if (currentLevel === 'Proactive') {
      return `${totalAlerts} ${itemText} flagged for early review`
    }
    return `${totalAlerts} ${itemText} detected for review`
  }

  const message = getMessage()

  return (
    <div className="flex flex-col gap-4 lg:flex-row text-center lg:text-left items-center justify-between">
      <div className="flex flex-col gap-2">
        <Typography variant="h4" className="font-bold capitalize">
          {currentLevel} Alerts
        </Typography>
        <Typography variant="p">
          🤖 {isMessageUpdating ? <Skeleton className="inline-block h-4 w-48" /> : message}
        </Typography>
        <AlertQuickToggle storeId={activeStoreId || undefined} size="sm" className="mt-2 self-center lg:self-start" />
      </div>

      <Link href="/dashboard/inventory/batches?filter=expiring">
        <Button
          variant={summary?.critical_count ? 'destructive' : 'subtleSecondary'}
          className="gap-2"
        >
          View urgent items
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  )
}
