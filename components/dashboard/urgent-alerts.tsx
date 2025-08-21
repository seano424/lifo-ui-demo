'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useUrgentAlerts } from '@/hooks/use-urgent-alerts'
import { getAlertMessage } from '@/lib/queries/urgent-alerts'

export function UrgentAlerts() {
  const { data, isLoading } = useUrgentAlerts()

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

  const { message, severity } = getAlertMessage(data?.criticalCount || 0, data?.urgentCount || 0)

  return (
    <div className="flex flex-col gap-4 sm:flex-row text-center sm:text-left items-center justify-between">
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
