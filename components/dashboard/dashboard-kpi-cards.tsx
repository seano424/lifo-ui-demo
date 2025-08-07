'use client'

import { useState } from 'react'
import {
  useInventoryKPI,
  useSalesKPI,
  useDonationKPI,
  useWasteKPI,
} from '@/hooks/use-dashboard-kpis'

import {
  useInventoryKPITrends,
  useSalesKPITrends,
  useDonationKPITrends,
  useWasteKPITrends,
} from '@/hooks/use-kpi-trends'

import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'

import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { KPICard } from '@/components/dashboard/kpi-card'
import { TimeSelector, TimePeriod } from '@/components/dashboard/TimeSelector'
import { KPITrendData } from '@/lib/queries/dashboard-kpi-trends'

export function DashboardKPICards() {
  const t = useTranslations('dashboard.kpis')
  const queryClient = useQueryClient()
  const activeStoreId = useActiveStoreId()
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod | null>(null)

  const inventoryQuery = useInventoryKPI()
  const salesQuery = useSalesKPI()
  const donationQuery = useDonationKPI()
  const wasteQuery = useWasteKPI()

  const inventoryTrendsQuery = useInventoryKPITrends(selectedPeriod || 'this_week')
  const salesTrendsQuery = useSalesKPITrends(selectedPeriod || 'this_week')
  const donationTrendsQuery = useDonationKPITrends(selectedPeriod || 'this_week')
  const wasteTrendsQuery = useWasteKPITrends(selectedPeriod || 'this_week')

  const inventoryData = inventoryQuery.data
  const salesData = salesQuery.data
  const donationData = donationQuery.data
  const wasteData = wasteQuery.data

  const showTrends = selectedPeriod !== null
  const inventoryTrendData = inventoryTrendsQuery.data as KPITrendData | undefined
  const salesTrendData = salesTrendsQuery.data as KPITrendData | undefined
  const donationTrendData = donationTrendsQuery.data as KPITrendData | undefined
  const wasteTrendData = wasteTrendsQuery.data as KPITrendData | undefined

  const handleRefresh = () => {
    if (activeStoreId) {
      // Invalidate all individual KPI queries to trigger refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardKPIs.inventory(activeStoreId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardKPIs.sales(activeStoreId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardKPIs.donations(activeStoreId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardKPIs.waste(activeStoreId),
      })
      // Also invalidate the combined query
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardKPIs.byStore(activeStoreId),
      })

      // Invalidate trends queries if showing trends
      if (selectedPeriod) {
        queryClient.invalidateQueries({
          queryKey: ['kpi-trends'],
        })
      }
    }
  }

  const isAnyFetching =
    inventoryQuery.isFetching ||
    salesQuery.isFetching ||
    donationQuery.isFetching ||
    wasteQuery.isFetching ||
    (showTrends &&
      (inventoryTrendsQuery.isFetching ||
        salesTrendsQuery.isFetching ||
        donationTrendsQuery.isFetching ||
        wasteTrendsQuery.isFetching))

  const hasAnyError =
    inventoryQuery.isError ||
    salesQuery.isError ||
    donationQuery.isError ||
    wasteQuery.isError ||
    (showTrends &&
      (inventoryTrendsQuery.isError ||
        salesTrendsQuery.isError ||
        donationTrendsQuery.isError ||
        wasteTrendsQuery.isError))

  return (
    <div className="w-full">
      <div className="relative ">
        <div className="flex items-center justify-between mb-6">
          <Typography className="text-brand-primary font-extrabold" variant="h3">
            {t('title')}
          </Typography>

          <div className="flex items-center gap-4">
            <TimeSelector
              value={selectedPeriod || 'this_week'}
              onChange={period => setSelectedPeriod(period)}
            />

            <Button
              variant="outline"
              className="hover:bg-transparent"
              size="sm"
              onClick={handleRefresh}
              disabled={isAnyFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isAnyFetching ? 'animate-spin' : ''}`} />
              <span>{t('refresh')}</span>
            </Button>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon="📦"
            label={t('inventory.label')}
            value={inventoryData?.totalValue ?? 0}
            productCount={inventoryData?.productCount ?? 0}
            subtitle={`${inventoryData?.batchCount ?? 0} ${t('inventory.subtitle')}`}
            isLoading={inventoryQuery.isLoading || (showTrends && inventoryTrendsQuery.isLoading)}
            isError={inventoryQuery.isError || (showTrends && inventoryTrendsQuery.isError)}
            isLink={true}
            link="/dashboard/inventory"
            showTrends={showTrends}
            trendData={inventoryTrendData}
          />

          <KPICard
            icon="💰"
            label={t('sales.label')}
            value={salesData?.totalRevenue ?? 0}
            change={salesData?.change ?? 0}
            changePercent={salesData?.changePercent ?? 0}
            subtitle={`${salesData?.transactionCount ?? 0} ${t('sales.subtitle')}`}
            isLoading={salesQuery.isLoading || (showTrends && salesTrendsQuery.isLoading)}
            isError={salesQuery.isError || (showTrends && salesTrendsQuery.isError)}
            isLink={true}
            link="/dashboard/outbound"
            showTrends={showTrends}
            trendData={salesTrendData}
          />

          <KPICard
            icon="❤️"
            label={t('donations.label')}
            value={donationData?.totalValue ?? 0}
            change={donationData?.change ?? 0}
            changePercent={donationData?.changePercent ?? 0}
            subtitle={`${donationData?.recipientCount ?? 0} ${t('donations.subtitle')}`}
            isLoading={donationQuery.isLoading || (showTrends && donationTrendsQuery.isLoading)}
            isError={donationQuery.isError || (showTrends && donationTrendsQuery.isError)}
            isLink={true}
            link="/dashboard/donations"
            showTrends={showTrends}
            trendData={donationTrendData}
          />

          <KPICard
            icon="🗑️"
            label={t('waste.label')}
            value={wasteData?.totalCost ?? 0}
            change={wasteData?.change ?? 0}
            changePercent={wasteData?.changePercent ?? 0}
            subtitle={`${wasteData?.itemCount ?? 0} ${t('waste.subtitle')}`}
            isLoading={wasteQuery.isLoading || (showTrends && wasteTrendsQuery.isLoading)}
            isError={wasteQuery.isError || (showTrends && wasteTrendsQuery.isError)}
            isLink={true}
            link="/dashboard/waste"
            showTrends={showTrends}
            trendData={wasteTrendData}
          />
        </div>

        {/* Error state message */}
        {hasAnyError && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-white">{t('errorMessage')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
