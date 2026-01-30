'use client'

import { useTranslations } from 'next-intl'

import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useExpiryDashboardSummary } from '@/hooks/use-expiry-dashboard-summary'
import { useDraftBatchCount } from '@/components/draft-batch-notification'
import { Button } from '@/components/ui/button'
// import { ExternalLink } from 'lucide-react'

interface InventoryOverviewCardProps {
  storeId: string | null
}

export function InventoryOverviewCard({ storeId }: InventoryOverviewCardProps) {
  const t = useTranslations('dashboard.inventoryOverview')
  const tExpiry = useTranslations('dashboard.expiringSoon')
  const { data, isLoading, error } = useExpiryDashboardSummary(storeId)
  const draftBatchCount = useDraftBatchCount()

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-brand-dark rounded-2xl border p-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex flex-col gap-4">
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

  return (
    <div className="bg-white dark:bg-brand-dark rounded-2xl border flex flex-col justify-between">
      {/* Header */}
      <div className="p-6 border-b h-24 flex items-center justify-between">
        <Typography variant="h3">{t('title')}</Typography>
      </div>

      {/* Stats */}
      <div className="p-6 flex-1">
        <div className="flex flex-col gap-4">
          {/* Total Batches */}
          <div className="flex items-center justify-between py-2">
            <Typography variant="p">{t('totalBatches')}</Typography>
            <Typography variant="p">{data.total_active_batches.toLocaleString()}</Typography>
          </div>

          {/* Products Tracked */}
          <div className="flex items-center justify-between py-2">
            <Typography variant="p">{t('productsTracked')}</Typography>
            <Typography variant="p">{data.total_products.toLocaleString()}</Typography>
          </div>

          {/* Draft Batches - Needs Dates */}
          <div className="flex items-center justify-between py-2">
            <Typography variant="p">{t('needsDates')}</Typography>
            <Typography variant="p">{draftBatchCount?.toLocaleString() || '0'}</Typography>
          </div>

          {/* Expiring This Week */}
          <div className="flex items-center justify-between py-2">
            <Typography variant="p" className="capitalize">
              {tExpiry('expiringThisWeek')}
            </Typography>
            <Typography variant="p" className="capitalize">
              {data.expiring_this_week?.toLocaleString() || '0'}
            </Typography>
          </div>
        </div>
      </div>

      {/* place at the bottom of the card */}
      <div className="flex gap-2 p-6 border-t">
        <Button
          asLink
          variant="gray"
          href="/dashboard/inventory/products?sort=active_batches_count&direction=desc"
          size="lg"
          className="w-full group/button"
        >
          {t('viewAllProducts')}
          {/* <ExternalLink className="w-4 h-4 text-gray-600 group-hover/button:text-gray-900 transition-colors duration-500 ease-in-out" /> */}
        </Button>
        <Button
          asLink
          variant="gray"
          href="/dashboard/inventory/batches"
          size="lg"
          className="w-full group/button"
        >
          {t('viewAllBatches')}{' '}
          {/* <ExternalLink className="w-4 h-4 text-gray-600 group-hover/button:text-gray-900 transition-colors duration-500 ease-in-out" /> */}
        </Button>
      </div>
    </div>
  )
}
