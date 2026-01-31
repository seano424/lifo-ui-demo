'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useDashboardSummary } from '@/hooks/use-dashboard-summary'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function ExpiredItemsSummary() {
  const t = useTranslations('storeInsights.expiredItems')
  const { data, isLoading, error } = useDashboardSummary()

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-background rounded-2xl border p-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-24" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-background rounded-2xl border p-6">
        <div className="text-center">
          <Typography variant="p">{t('errors.loadingError')}</Typography>
        </div>
      </div>
    )
  }

  // Get expired items data from dashboard summary
  const expiredCount = data.expired_items_count
  const expiredValue = data.expired_items_value

  return (
    <div className="bg-white dark:bg-background rounded-2xl border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex justify-between items-center gap-2">
          <div className="text-foreground dark:text-brand-white flex flex-col gap-1">
            <Typography variant="h4">{t('title')}</Typography>
            <Typography variant="small" className="text-foreground dark:text-brand-white">
              {t('subtitle')}
            </Typography>
          </div>
          <div className="text-right text-foreground dark:text-brand-white flex items-center gap-1">
            <Typography variant="h2">{expiredCount}</Typography>
            <Typography variant="p">€{Math.round(expiredValue).toLocaleString()}</Typography>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="p-6">
        {expiredCount === 0 ? (
          <div className="text-center py-4">
            <div className="h-8 w-8 bg-primary-500 rounded-full mx-auto mb-2 flex items-center justify-center">
              <div className="h-2 w-2 bg-white rounded-full" />
            </div>
            <Typography variant="p" className="">
              {t('noExpiredItems')}
            </Typography>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Expired Summary */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <Typography variant="p" className="text-foreground dark:text-brand-white">
                  {t('totalExpired')}
                </Typography>
              </div>
              <div className="text-right">
                <Typography variant="p" className="font-semibold">
                  {expiredCount}
                </Typography>
                <Typography variant="small" className="text-foreground">
                  €{Math.round(expiredValue).toLocaleString()}
                </Typography>
              </div>
            </div>

            {/* Actions Needed */}
            <div className="border-t pt-4 mt-4">
              <Typography variant="p" className=" text-foreground dark:text-brand-white mb-3">
                {t('actionsNeeded')}:
              </Typography>
              <div className="flex flex-col gap-2 text-sm text-foreground dark:text-brand-white">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 bg-gray-400 rounded-full" />
                  <Typography variant="small">{t('reviewDiscounts')}</Typography>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 bg-gray-400 rounded-full" />
                  <Typography variant="small">{t('scheduleDonation')}</Typography>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 bg-gray-400 rounded-full" />
                  <Typography variant="small">{t('removeFromShelves')}</Typography>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
