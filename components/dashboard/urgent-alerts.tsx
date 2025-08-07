'use client'

import React from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useUrgentAlerts } from '@/hooks/use-urgent-alerts'
import { getAlertMessage } from '@/lib/queries/urgent-alerts'
import { cn } from '@/lib/utils'

export function UrgentAlerts({ className }: { className?: string }) {
  const { data, isLoading, isError, refetch } = useUrgentAlerts()

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      </Card>
    )
  }

  // Error state
  if (isError) {
    return (
      <Card className={cn('border-red-200 bg-red-50 p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-sm text-red-900">Unable to load expiry alerts</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-red-700 hover:bg-red-100"
          >
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  // Get alert message and severity
  const { message, severity } = getAlertMessage(data?.criticalCount || 0, data?.urgentCount || 0)

  // Don't show alert if there are no urgent/critical items
  // if (severity === 'safe') {
  //   return null
  // }

  // Determine styling based on severity
  const severityStyles = {
    critical: {
      card: 'border-red-200 bg-red-50',
      dot: 'bg-red-600',
      text: 'text-red-900',
      button: 'bg-blue-600 text-white hover:bg-blue-700',
    },
    urgent: {
      card: 'border-orange-200 bg-orange-50',
      dot: 'bg-orange-600',
      text: 'text-orange-900',
      button: 'bg-blue-600 text-white hover:bg-blue-700',
    },
    safe: {
      card: 'border-green-200 bg-green-50',
      dot: 'bg-green-600',
      text: 'text-green-900',
      button: 'bg-green-600 text-white hover:bg-green-700',
    },
  }

  const styles = severityStyles[severity]

  return (
    <Card className={cn('p-4 rounded-2xl', styles.card, className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Pulsing dot indicator for critical alerts */}
          <div className="relative">
            <div className={cn('h-2 w-2 rounded-full', styles.dot)} />
            {severity === 'critical' && (
              <div
                className={cn('absolute inset-0 h-2 w-2 animate-ping rounded-full', styles.dot)}
              />
            )}
          </div>

          {/* Alert message */}
          <span className={cn('text-sm font-medium', styles.text)}>{message}</span>
        </div>

        {/* Action button */}
        <Link href="/dashboard/inventory/batches?filter=expiring">
          <Button size="sm" className={cn('gap-2', styles.button)}>
            VIEW EXPIRING ITEMS
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Card>
  )
}

// Skeleton loader component for use in dashboard loading states
export function UrgentAlertsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
    </Card>
  )
}
