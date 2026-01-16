'use client'

import { Package, ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useExpiryDashboardSummary } from '@/hooks/use-expiry-dashboard-summary'

interface InventoryOverviewCardProps {
  storeId: string | null
}

export function InventoryOverviewCard({ storeId }: InventoryOverviewCardProps) {
  const t = useTranslations('dashboard.inventoryOverview')
  const { data, isLoading, error } = useExpiryDashboardSummary(storeId)

  if (isLoading) {
    return (
      <Card className="p-6 space-y-4">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
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

  return (
    <Card className="p-6 space-y-5">
      {/* Header */}
      <Typography variant="h3" className="font-bold">
        {t('title')}
      </Typography>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Batches */}
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/50 border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-5 w-5" />
            <Typography variant="small" className="font-medium">
              {t('totalBatches')}
            </Typography>
          </div>
          <Typography variant="h2" className="font-bold">
            {data.total_active_batches.toLocaleString()}
          </Typography>
        </div>

        {/* Products Tracked */}
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/50 border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShoppingBag className="h-5 w-5" />
            <Typography variant="small" className="font-medium">
              {t('productsTracked')}
            </Typography>
          </div>
          <Typography variant="h2" className="font-bold">
            {data.total_products.toLocaleString()}
          </Typography>
        </div>
      </div>
    </Card>
  )
}
