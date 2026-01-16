'use client'

import { useTranslations } from 'next-intl'

import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useExpiryDashboardSummary } from '@/hooks/use-expiry-dashboard-summary'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

interface InventoryOverviewCardProps {
  storeId: string | null
}

export function InventoryOverviewCard({ storeId }: InventoryOverviewCardProps) {
  const t = useTranslations('dashboard.inventoryOverview')
  const { data, isLoading, error } = useExpiryDashboardSummary(storeId)

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-brand-dark rounded-2xl border p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="space-y-3">
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
        <Typography variant="h4">{t('title')}</Typography>
      </div>

      {/* Stats */}
      <div className="p-6 flex-1">
        <div className="space-y-3">
          {/* Total Batches */}
          <div className="flex items-center justify-between py-2">
            <Typography variant="h5">{t('totalBatches')}</Typography>
            <Typography variant="h5">{data.total_active_batches.toLocaleString()}</Typography>
          </div>

          {/* Products Tracked */}
          <div className="flex items-center justify-between py-2">
            <Typography variant="h5">{t('productsTracked')}</Typography>
            <Typography variant="h5">{data.total_products.toLocaleString()}</Typography>
          </div>
        </div>
      </div>

      {/* place at the bottom of the card */}
      <div className="flex gap-2 p-6 border-t">
        <Button
          asLink
          variant="gray"
          href="/dashboard/inventory/products"
          size="lg"
          className="w-full group/button"
        >
          {t('viewAllProducts')}
          <ExternalLink className="w-4 h-4 text-gray-600 group-hover/button:text-gray-900 transition-colors duration-500 ease-in-out" />
        </Button>
        <Button
          asLink
          variant="gray"
          href="/dashboard/inventory/batches"
          size="lg"
          className="w-full group/button"
        >
          {t('viewAllBatches')}{' '}
          <ExternalLink className="w-4 h-4 text-gray-600 group-hover/button:text-gray-900 transition-colors duration-500 ease-in-out" />
        </Button>
      </div>
    </div>
  )
}
