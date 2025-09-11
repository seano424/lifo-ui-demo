'use client'

import { AlertTriangle, Calendar, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useActiveBatches } from '@/hooks/use-batches'
import { useStoreAnalytics } from '@/hooks/use-scoring-analytics'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface ActionableBatch {
  batch_id: string
  product_name: string
  expiry_date: string
  urgency: 'critical' | 'high' | 'medium' | 'low'
  current_quantity: number
  potential_loss: number
  status?: string // Add optional status field
}

interface AnalyticsData {
  analytics?: {
    actionable_batches?: ActionableBatch[]
    dashboard_summary?: {
      total_batches: number
      expired_count: number
    }
  }
}

export function BatchStatusSummary() {
  const t = useTranslations('storeInsights.batchStatus')
  const activeStoreId = useActiveStoreId()
  const { data, isLoading, error } = useStoreAnalytics(activeStoreId, '7d')
  const { count: totalActiveBatchesCount, isLoading: isLoadingActiveBatches } = useActiveBatches()

  if (isLoading || isLoadingActiveBatches) {
    return (
      <div className="bg-white dark:bg-brand-dark rounded-2xl border p-6">
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
      <div className="bg-white dark:bg-brand-dark rounded-2xl border p-6">
        <div className="text-center ">
          <Typography variant="p">{t('errors.loadingError')}</Typography>
        </div>
      </div>
    )
  }

  const actionableBatches =
    (data?.analytics as AnalyticsData['analytics'])?.actionable_batches || []

  // Calculate client-side urgency to override stale API data
  // Use current date for urgency calculations
  const today = new Date()
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))

  // Function to calculate correct urgency based on current date
  const calculateClientUrgency = (expiryDate: string): 'critical' | 'high' | 'medium' | 'low' => {
    // Parse YYYY-MM-DD format as UTC to avoid timezone issues
    const expiryUTC = new Date(`${expiryDate}T00:00:00Z`)
    const daysToExpiry = Math.floor(
      (expiryUTC.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24),
    )

    if (daysToExpiry < 0) {
      return 'critical' // Already expired
    } else if (daysToExpiry === 0) {
      return 'critical' // Expires today
    } else if (daysToExpiry <= 1) {
      return 'high' // Expires tomorrow
    } else if (daysToExpiry <= 7) {
      return 'medium' // Expires within a week
    } else {
      return 'low' // Expires later
    }
  }

  // Use all actionable batches since API now only returns active batches
  const activeBatchesFromActionable = actionableBatches

  // Count active batches by CLIENT-CALCULATED urgency (ignoring stale API urgency)
  const criticalCount = activeBatchesFromActionable.filter(
    batch => calculateClientUrgency(batch.expiry_date) === 'critical',
  ).length
  const highCount = activeBatchesFromActionable.filter(
    batch => calculateClientUrgency(batch.expiry_date) === 'high',
  ).length
  const mediumCount = activeBatchesFromActionable.filter(
    batch => calculateClientUrgency(batch.expiry_date) === 'medium',
  ).length
  const lowCount = activeBatchesFromActionable.filter(
    batch => calculateClientUrgency(batch.expiry_date) === 'low',
  ).length

  const totalNeedsAttention = criticalCount + highCount + mediumCount + lowCount
  const okCount = totalActiveBatchesCount - totalNeedsAttention
  const attentionPercentage =
    totalActiveBatchesCount > 0
      ? Math.round((totalNeedsAttention / totalActiveBatchesCount) * 100)
      : 0

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />
      case 'high':
        return <AlertTriangle className="h-4 w-4" />
      case 'medium':
        return <Clock className="h-4 w-4 " />
      case 'low':
        return <Calendar className="h-4 w-4 " />
      default:
        return null
    }
  }

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return t('urgency.critical')
      case 'high':
        return t('urgency.high')
      case 'medium':
        return t('urgency.medium')
      case 'low':
        return t('urgency.low')
      default:
        return urgency
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="bg-white dark:bg-brand-dark rounded-2xl border lg:w-1/2">
        {/* Header - Needs Attention */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center gap-2">
            <div className="text-gray-500 dark:text-brand-white flex flex-col gap-1">
              <Typography variant="h4">{t('needsAttention')}</Typography>
              <Typography variant="small">{t('activeInventory')}</Typography>
            </div>
            <Typography
              variant="h2"
              className="text-3xl font-bold text-gray-900 dark:text-brand-white mt-1"
            >
              {totalNeedsAttention}
            </Typography>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="p-6">
          <div className="space-y-3">
            {/* Critical */}
            {criticalCount > 0 && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  {getUrgencyIcon('critical')}
                  <Typography variant="p" className="text-gray-700 dark:text-brand-white">
                    {getUrgencyLabel('critical')}
                  </Typography>
                </div>
                <Typography variant="p">{criticalCount}</Typography>
              </div>
            )}

            {/* High */}
            {highCount > 0 && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  {getUrgencyIcon('high')}
                  <Typography variant="p" className="text-gray-700 dark:text-brand-white">
                    {getUrgencyLabel('high')}
                  </Typography>
                </div>
                <Typography variant="p">{highCount}</Typography>
              </div>
            )}

            {/* Medium */}
            {mediumCount > 0 && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  {getUrgencyIcon('medium')}
                  <Typography variant="p" className="text-gray-700 dark:text-brand-white">
                    {getUrgencyLabel('medium')}
                  </Typography>
                </div>
                <Typography variant="p">{mediumCount}</Typography>
              </div>
            )}

            {/* Low */}
            {lowCount > 0 && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  {getUrgencyIcon('low')}
                  <Typography variant="p" className="text-gray-700 dark:text-brand-white">
                    {getUrgencyLabel('low')}
                  </Typography>
                </div>
                <Typography variant="p">{lowCount}</Typography>
              </div>
            )}

            {/* OK Status - only show if there are batches that are OK */}
            {okCount > 0 && (
              <div className="flex items-center justify-between py-2 border-t pt-4 mt-4">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 bg-primary-500 rounded-full" />
                  <Typography variant="p" className="text-gray-700 dark:text-brand-white">
                    {t('status.ok')}
                  </Typography>
                </div>
                <Typography variant="p">{okCount}</Typography>
              </div>
            )}

            {/* No items need attention */}
            {totalNeedsAttention === 0 && (
              <div className="text-center py-4">
                <div className="h-8 w-8 bg-primary-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <div className="h-2 w-2 bg-white rounded-full" />
                </div>
                <Typography variant="p" className="">
                  {t('status.allGood')}
                </Typography>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-brand-dark rounded-2xl border lg:w-1/2 flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center gap-2">
            <Typography variant="h4">{t('status.ok')}</Typography>
            <Typography
              variant="h2"
              className="text-3xl font-bold text-gray-900 dark:text-brand-white mt-1"
            >
              {okCount}
            </Typography>
          </div>
        </div>
        <div className="p-6 flex flex-col gap-2 flex-1 justify-end text-right">
          <Typography variant="h4" className="lowercase text-primary-900 dark:text-brand-white">
            {attentionPercentage}% {t('needsAttention')}
          </Typography>
          <div className="h-2 bg-gray-200 dark:bg-brand-dark rounded-full mt-2">
            <div
              className="h-2 bg-primary-900 rounded-full transition-all duration-300"
              style={{ width: `${attentionPercentage}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between items-center">
            <Typography variant="small" className=" mt-1">
              {okCount} {t('status.ok')}
            </Typography>
            <Typography variant="small" className=" mt-1">
              {t('activeBatchesCount', {
                needsAttention: totalNeedsAttention,
                total: totalActiveBatchesCount,
              })}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  )
}
