'use client'

import { AlertTriangle, Calendar, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useStoreAnalytics } from '@/hooks/use-scoring-analytics'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface ActionableBatch {
  urgency: 'critical' | 'high' | 'medium' | 'low'
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
        <div className="text-center ">
          <Typography variant="p">{t('errors.loadingError')}</Typography>
        </div>
      </div>
    )
  }

  const actionableBatches =
    (data?.analytics as AnalyticsData['analytics'])?.actionable_batches || []
  const dashboardSummary = (data?.analytics as AnalyticsData['analytics'])
    ?.dashboard_summary
  const totalBatches = dashboardSummary?.total_batches || 0
  const expiredCount = dashboardSummary?.expired_count || 0
  const activeBatches = totalBatches - expiredCount

  // Count batches by urgency
  const criticalCount = actionableBatches.filter(
    (batch) => batch.urgency === 'critical'
  ).length
  const highCount = actionableBatches.filter(
    (batch) => batch.urgency === 'high'
  ).length
  const mediumCount = actionableBatches.filter(
    (batch) => batch.urgency === 'medium'
  ).length
  const lowCount = actionableBatches.filter(
    (batch) => batch.urgency === 'low'
  ).length

  const totalNeedsAttention = criticalCount + highCount + mediumCount + lowCount
  const okCount = activeBatches - totalNeedsAttention
  const attentionPercentage =
    activeBatches > 0
      ? Math.round((totalNeedsAttention / activeBatches) * 100)
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
      <div className="bg-white rounded-2xl border lg:w-1/2">
        {/* Header - Needs Attention */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center gap-2">
            <Typography variant="h4">{t('needsAttention')}</Typography>
            <Typography
              variant="h2"
              className="text-3xl font-bold text-gray-900 mt-1"
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
                  <Typography
                    variant="p"
                    className="text-gray-700"
                  >
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
                  <Typography
                    variant="p"
                    className="text-gray-700"
                  >
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
                  <Typography
                    variant="p"
                    className="text-gray-700"
                  >
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
                  <Typography
                    variant="p"
                    className="text-gray-700"
                  >
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
                  <div className="h-4 w-4 bg-green-500 rounded-full" />
                  <Typography
                    variant="p"
                    className="text-gray-700"
                  >
                    {t('status.ok')}
                  </Typography>
                </div>
                <Typography variant="p">{okCount}</Typography>
              </div>
            )}

            {/* No items need attention */}
            {totalNeedsAttention === 0 && (
              <div className="text-center py-4">
                <div className="h-8 w-8 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <div className="h-2 w-2 bg-white rounded-full" />
                </div>
                <Typography
                  variant="p"
                  className=""
                >
                  {t('status.allGood')}
                </Typography>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border lg:w-1/2 flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center gap-2">
            <Typography variant="h4">{t('status.ok')}</Typography>
            <Typography
              variant="h2"
              className="text-3xl font-bold text-gray-900 mt-1"
            >
              {okCount}
            </Typography>
          </div>
        </div>
        <div className="p-6 flex flex-col gap-2 flex-1 justify-end text-right">
          <Typography
            variant="h4"
            className="lowercase text-primary-900"
          >
            {attentionPercentage}% {t('needsAttention')}
          </Typography>
          <div className="h-2 bg-gray-200 rounded-full mt-2">
            <div
              className="h-2 bg-primary-900 rounded-full transition-all duration-300"
              style={{ width: `${attentionPercentage}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between items-center">
            <Typography
              variant="small"
              className=" mt-1"
            >
              {okCount} {t('status.ok')}
            </Typography>
            <Typography
              variant="small"
              className=" mt-1"
            >
              {t('activeBatchesCount', {
                needsAttention: totalNeedsAttention,
                total: activeBatches,
              })}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  )
}
