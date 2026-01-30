'use client'

import { useTranslations } from 'next-intl'
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
      <div className="bg-white dark:bg-brand-dark rounded-2xl border p-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-brand-dark rounded-2xl border p-6">
        <div className="text-center">
          <Typography variant="p">{t('errors.loadingError')}</Typography>
        </div>
      </div>
    )
  }

  // Use the pre-calculated total_expiring which matches the sidebar badge
  const totalExpiring = data.total_expiring
  const totalActiveBatches = data.total_active_batches
  const expiringThisWeek = data.expiring_this_week
  // Calculate percentage based on batches expiring this week
  const expiringPercentage =
    totalActiveBatches > 0 ? Math.round((expiringThisWeek / totalActiveBatches) * 100) : 0

  return (
    <div className="bg-white dark:bg-brand-dark rounded-2xl border">
      {/* Header */}
      <div className="p-6 border-b h-24 flex flex-col justify-center w-full">
        <div className="flex justify-between items-center gap-2">
          <Typography variant="h3">{t('title')}</Typography>
          <div className="flex items-center gap-2 border rounded-full px-4 py-2">
            <Typography variant="h3">{totalExpiring}</Typography>
          </div>
        </div>
      </div>

      {/* Expiry Counts */}
      <div className="py-6">
        <div className="space-y-3 px-6">
          {/* Today */}
          <div className="flex items-center justify-between py-2">
            <Typography variant="p">{t('today')}</Typography>
            <Typography variant="p">{data.expiring_today}</Typography>
          </div>

          {/* Tomorrow */}
          <div className="flex items-center justify-between py-2">
            <Typography variant="p">{t('tomorrow')}</Typography>
            <Typography variant="p">{data.expiring_tomorrow}</Typography>
          </div>

          {/* In Two Days */}
          <div className="flex items-center justify-between py-2">
            <Typography variant="p">{t('inTwoDays')}</Typography>
            <Typography variant="p">{data.expiring_in_two_days}</Typography>
          </div>

          {/* In Three Days */}
          <div className="flex items-center justify-between py-2">
            <Typography variant="p">{t('inThreeDays')}</Typography>
            <Typography variant="p">{data.expiring_in_three_days}</Typography>
          </div>

          {/* This Week */}
          <div className="flex items-center justify-between py-2">
            <Typography variant="p">{t('thisWeek')}</Typography>
            <Typography variant="p">{data.expiring_this_week}</Typography>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1 justify-end text-right mt-8 border-t border-gray-200 dark:border-brand-dark pt-8 px-6">
          <Typography variant="p" className="capitalize">
            {expiringPercentage}% {t('expiringWithinWeek')}
          </Typography>
          <div className="h-2 bg-gray-200 dark:bg-brand-dark rounded-full mt-4">
            <div
              className="h-2 bg-primary-900 rounded-full transition-all duration-300"
              style={{ width: `${expiringPercentage}%` }}
            />
          </div>
          <div className="mt-4 flex justify-between items-center">
            {/* <Typography
              variant="small"
              className="mt-1 capitalize"
            >
              {totalActiveBatches - totalExpiring} {t('notExpiring')}
            </Typography> */}
            <Typography variant="p" className="mt-1 capitalize">
              {expiringThisWeek} {t('expiringThisWeek')}
            </Typography>
            <Typography variant="p" className="mt-1 capitalize">
              {t('expiringCount', {
                expiring: expiringThisWeek,
                total: totalActiveBatches,
              })}
            </Typography>
          </div>
        </div>

        {/* See All Link */}
        {/* <Button
          asLink
          href="/dashboard/expiring-soon"
          size="lg"
          className="w-full mt-6"
        >
          {t('seeAll')}
        </Button> */}
      </div>
    </div>
  )
}
