'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { AlertQuickToggle } from './alert-quick-toggle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useScoringAlerts } from '@/hooks/use-scoring-analytics'
import { useActiveStoreId } from '@/lib/stores/store-context'

export function UrgentAlerts() {
  const activeStoreId = useActiveStoreId()
  const { data, isLoading, error } = useScoringAlerts(activeStoreId) // Now uses store threshold settings
  
  // Debug logging
  console.log('[UrgentAlerts] Debug:', { 
    activeStoreId, 
    data, 
    summary: data?.summary,
    alerts: data?.alerts,
    isLoading, 
    error 
  })

  if (isLoading) {
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

  const getSeverity = () => {
    if (!summary) return 'low'
    if (summary.critical_count > 0) return 'critical'
    if (summary.high_count > 0) return 'urgent'
    return 'low'
  }

  const getMessage = () => {
    if (!summary) return 'Loading alert data...'
    const totalAlerts = summary.total_alerts
    if (totalAlerts === 0) return 'All items are within safe thresholds'
    if (summary.critical_count > 0)
      return `${summary.critical_count} critical items need immediate action`
    if (summary.high_count > 0) return `${summary.high_count} items require attention soon`
    return `${totalAlerts} items flagged by scoring system`
  }

  const severity = getSeverity()
  const message = getMessage()

  return (
    <div className="flex flex-col gap-4 lg:flex-row text-center lg:text-left items-center justify-between">
      <div className="flex flex-col gap-2">
        <Typography variant="h4" className="font-bold capitalize">
          AI {severity} Alerts
        </Typography>
        <Typography variant="p">🤖 {message}</Typography>
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
