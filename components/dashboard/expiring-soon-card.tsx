'use client'

import { ArrowRight, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useExpiryDashboardSummary } from '@/hooks/use-expiry-dashboard-summary'

interface ExpiringSoonCardProps {
  storeId: string | null
}

export function ExpiringSoonCard({ storeId }: ExpiringSoonCardProps) {
  const t = useTranslations('dashboard.expiringSoon')
  const { data, isLoading, error } = useExpiryDashboardSummary(storeId)

  if (isLoading) {
    return (
      <Card className="p-6 space-y-4">
        <Skeleton className="h-7 w-40" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Typography variant="p" className="text-muted-foreground">
            {t('errors.loadingError')}
          </Typography>
        </div>
      </Card>
    )
  }

  const expiryItems = [
    {
      label: t('today'),
      count: data.expiring_today,
      icon: <Clock className="h-5 w-5 text-red-500" />,
      urgent: true,
    },
    {
      label: t('tomorrow'),
      count: data.expiring_tomorrow,
      icon: <Calendar className="h-5 w-5 text-orange-500" />,
      urgent: false,
    },
    {
      label: t('thisWeek'),
      count: data.expiring_this_week,
      icon: <Calendar className="h-5 w-5 text-yellow-500" />,
      urgent: false,
    },
  ]

  return (
    <Card className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Typography variant="h3" className="font-bold">
          {t('title')}
        </Typography>
      </div>

      {/* Expiry Counts */}
      <div className="space-y-3">
        {expiryItems.map(item => (
          <div
            key={item.label}
            className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
              item.urgent
                ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30'
                : 'bg-muted/50'
            }`}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <Typography variant="p" className="font-medium">
                {item.label}
              </Typography>
            </div>
            <Typography
              variant="h3"
              className={`font-bold ${item.urgent ? 'text-red-600 dark:text-red-400' : ''}`}
            >
              {item.count}
            </Typography>
          </div>
        ))}
      </div>

      {/* See All Link */}
      <Link
        href="/dashboard/expiring-soon"
        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-primary bg-primary/5 hover:bg-primary/10 transition-colors group min-h-[44px]"
      >
        <Typography variant="p" className="font-medium text-primary">
          {t('seeAll')}
        </Typography>
        <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
      </Link>
    </Card>
  )
}
