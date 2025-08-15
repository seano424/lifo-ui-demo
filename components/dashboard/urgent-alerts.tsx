'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useUrgentAlerts } from '@/hooks/use-urgent-alerts'
import { getAlertMessage } from '@/lib/queries/urgent-alerts'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/ui/typography'

export function UrgentAlerts({ className }: { className?: string }) {
  const { data, isLoading, isError, refetch } = useUrgentAlerts()

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

  const { message, severity } = getAlertMessage(data?.criticalCount || 0, data?.urgentCount || 0)

  return (
    <div className="flex flex-col gap-4 sm:flex-row text-center sm:text-left items-center justify-between border border-primary-500/10 shadow-xs rounded p-4 bg-primary-50/5">
      <div className="flex flex-col gap-2">
        <Typography variant="h4" className="font-bold capitalize">
          {severity} Alerts
        </Typography>
        <Typography variant="p">🚨 {message}</Typography>
      </div>

      <Link href="/dashboard/inventory/batches?filter=expiring">
        <Button variant="subtleSecondary" className="gap-2">
          View expiring items
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  )
}

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
