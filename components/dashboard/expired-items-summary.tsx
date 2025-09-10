'use client'

import { AlertTriangle, Clock, TrendingDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useStoreAnalytics } from '@/hooks/use-scoring-analytics'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface ActionableBatch {
  batch_id: string
  product_name: string
  expiry_date: string
  urgency: 'critical' | 'high' | 'medium' | 'low'
  current_quantity: number
  potential_loss: number
}

interface AnalyticsData {
  analytics?: {
    actionable_batches?: ActionableBatch[]
  }
}

export function ExpiredItemsSummary() {
  const t = useTranslations('storeInsights.expiredItems')
  const activeStoreId = useActiveStoreId()
  const { data, isLoading, error } = useStoreAnalytics(activeStoreId, '7d')

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-24" />
          <div className="space-y-3">
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
      <div className="bg-white rounded-2xl border p-6">
        <div className="text-center">
          <Typography variant="p">{t('errors.loadingError')}</Typography>
        </div>
      </div>
    )
  }

  const actionableBatches =
    (data?.analytics as AnalyticsData['analytics'])?.actionable_batches || []

  // Filter to only include expired batches
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiredBatches = actionableBatches.filter((batch) => {
    const expiryDate = new Date(batch.expiry_date)
    return expiryDate < today
  })

  // Categorize expired batches by how long they've been expired
  const categorizeExpired = (expiredBatches: ActionableBatch[]) => {
    const recentlyExpired = expiredBatches.filter((batch) => {
      const expiryDate = new Date(batch.expiry_date)
      const daysExpired = Math.floor(
        (today.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysExpired <= 3
    })

    const weekOld = expiredBatches.filter((batch) => {
      const expiryDate = new Date(batch.expiry_date)
      const daysExpired = Math.floor(
        (today.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysExpired > 3 && daysExpired <= 7
    })

    const older = expiredBatches.filter((batch) => {
      const expiryDate = new Date(batch.expiry_date)
      const daysExpired = Math.floor(
        (today.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysExpired > 7
    })

    const totalValue = expiredBatches.reduce(
      (sum, batch) => sum + batch.potential_loss,
      0
    )

    return { recentlyExpired, weekOld, older, totalValue }
  }

  const { recentlyExpired, weekOld, older, totalValue } =
    categorizeExpired(expiredBatches)

  const getUrgencyIcon = (category: string) => {
    switch (category) {
      case 'recent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'week':
        return <Clock className="h-4 w-4 text-orange-500" />
      case 'older':
        return <TrendingDown className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-2xl border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex justify-between items-center gap-2">
          <div>
            <Typography variant="h4">{t('title')}</Typography>
            <Typography
              variant="small"
              className="text-gray-500"
            >
              {t('subtitle')}
            </Typography>
          </div>
          <div className="text-right">
            <Typography
              variant="h2"
              className="text-3xl font-bold text-gray-900"
            >
              {expiredBatches.length}
            </Typography>
            <Typography
              variant="small"
              className="text-gray-500"
            >
              €{Math.round(totalValue).toLocaleString()}
            </Typography>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="p-6">
        {expiredBatches.length === 0 ? (
          <div className="text-center py-4">
            <div className="h-8 w-8 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center">
              <div className="h-2 w-2 bg-white rounded-full" />
            </div>
            <Typography
              variant="p"
              className=""
            >
              {t('noExpiredItems')}
            </Typography>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recently Expired */}
            {recentlyExpired.length > 0 && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  {getUrgencyIcon('recent')}
                  <Typography
                    variant="p"
                    className="text-gray-700"
                  >
                    {t('recentlyExpired')} (≤3 {t('days')})
                  </Typography>
                </div>
                <Typography variant="p">{recentlyExpired.length}</Typography>
              </div>
            )}

            {/* Week Old */}
            {weekOld.length > 0 && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  {getUrgencyIcon('week')}
                  <Typography
                    variant="p"
                    className="text-gray-700"
                  >
                    {t('weekOld')} (4-7 {t('days')})
                  </Typography>
                </div>
                <Typography variant="p">{weekOld.length}</Typography>
              </div>
            )}

            {/* Older */}
            {older.length > 0 && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  {getUrgencyIcon('older')}
                  <Typography
                    variant="p"
                    className="text-gray-700"
                  >
                    {t('older')} ({'>'}7 {t('days')})
                  </Typography>
                </div>
                <Typography variant="p">{older.length}</Typography>
              </div>
            )}

            {/* Actions Needed */}
            <div className="border-t pt-4 mt-4">
              <Typography
                variant="p"
                className="font-medium text-gray-900 mb-3"
              >
                {t('actionsNeeded')}:
              </Typography>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 bg-gray-400 rounded-full" />
                  <Typography variant="small">
                    {t('reviewDiscounts')}
                  </Typography>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 bg-gray-400 rounded-full" />
                  <Typography variant="small">
                    {t('scheduleDonation')}
                  </Typography>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 bg-gray-400 rounded-full" />
                  <Typography variant="small">
                    {t('removeFromShelves')}
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
