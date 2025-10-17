'use client'

import { KPICard } from '@/components/dashboard/kpi-card'
import { type TimePeriod, TimeSelector } from '@/components/dashboard/TimeSelector'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import {
  useDonationKPI,
  useInventoryKPI,
  useSalesKPI,
  useWasteKPI,
} from '@/hooks/use-dashboard-kpis'
import {
  useDonationKPITrends,
  useInventoryKPITrends,
  useSalesKPITrends,
  useWasteKPITrends,
} from '@/hooks/use-kpi-trends'
import type { KPITrendData } from '@/lib/queries/dashboard-kpi-trends'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

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
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-center gap-2 justify-between">
          <Typography variant="h4" className="font-bold">
            {t('title')}
          </Typography>
          <Typography variant="p" className="text-muted-foreground dark:text-secondary-50">
            Last updated: {new Date().toLocaleDateString()}
          </Typography>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <TimeSelector
            value={selectedPeriod || 'this_week'}
            onChange={period => setSelectedPeriod(period)}
          />

          <Button variant="outline" onClick={handleRefresh} disabled={isAnyFetching}>
            <RefreshCw className={`h-4 w-4 ${isAnyFetching ? 'animate-spin' : ''}`} />
            <span>{t('refresh')}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon="euro"
          label={t('inventory.label')}
          value={inventoryData?.totalValue ?? 0}
          productCount={
            showTrends ? inventoryTrendData?.metadata?.productCount : inventoryData?.productCount
          }
          subtitle={`${showTrends ? (inventoryTrendData?.metadata?.batchCount ?? 0) : (inventoryData?.batchCount ?? 0)} ${t('inventory.subtitle')}`}
          isLoading={inventoryQuery.isLoading || (showTrends && inventoryTrendsQuery.isLoading)}
          isError={inventoryQuery.isError || (showTrends && inventoryTrendsQuery.isError)}
          isLink={true}
          link="/dashboard/inventory"
          showTrends={showTrends}
          trendData={inventoryTrendData}
        />

        <KPICard
          icon="sales"
          label={t('sales.label')}
          value={salesData?.totalRevenue ?? 0}
          change={salesData?.change ?? 0}
          changePercent={salesData?.changePercent ?? 0}
          subtitle={`${showTrends ? (salesTrendData?.metadata?.transactionCount ?? 0) : (salesData?.transactionCount ?? 0)} ${t('sales.subtitle')}`}
          isLoading={salesQuery.isLoading || (showTrends && salesTrendsQuery.isLoading)}
          isError={salesQuery.isError || (showTrends && salesTrendsQuery.isError)}
          isLink={true}
          link="/dashboard/scan-out"
          showTrends={showTrends}
          trendData={salesTrendData}
        />

        <KPICard
          icon="donation"
          label={t('donations.label')}
          value={donationData?.totalValue ?? 0}
          change={donationData?.change ?? 0}
          changePercent={donationData?.changePercent ?? 0}
          subtitle={`${showTrends ? (donationTrendData?.metadata?.recipientCount ?? 0) : (donationData?.recipientCount ?? 0)} ${t('donations.subtitle')}`}
          isLoading={donationQuery.isLoading || (showTrends && donationTrendsQuery.isLoading)}
          isError={donationQuery.isError || (showTrends && donationTrendsQuery.isError)}
          isLink={true}
          link="/dashboard/donations"
          showTrends={showTrends}
          trendData={donationTrendData}
        />

        <KPICard
          icon="waste"
          label={t('waste.label')}
          value={wasteData?.totalCost ?? 0}
          change={wasteData?.change ?? 0}
          changePercent={wasteData?.changePercent ?? 0}
          subtitle={`${showTrends ? (wasteTrendData?.metadata?.itemCount ?? 0) : (wasteData?.itemCount ?? 0)} ${t('waste.subtitle')}`}
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
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <p className="text-sm text-white">{t('errorMessage')}</p>
        </div>
      )}
    </div>
  )
}
