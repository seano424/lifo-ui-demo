'use client'

import { KPICard } from './kpi-card'
import {
  useInventoryKPI,
  useSalesKPI,
  useDonationKPI,
  useWasteKPI,
} from '@/hooks/use-dashboard-kpis'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { Typography } from '@/components/ui/typography'

export function DashboardKPICards() {
  const queryClient = useQueryClient()
  const activeStoreId = useActiveStoreId()

  const inventoryQuery = useInventoryKPI()
  const salesQuery = useSalesKPI()
  const donationQuery = useDonationKPI()
  const wasteQuery = useWasteKPI()

  const inventoryData = inventoryQuery.data
  const salesData = salesQuery.data
  const donationData = donationQuery.data
  const wasteData = wasteQuery.data

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
    }
  }

  const isAnyFetching =
    inventoryQuery.isFetching ||
    salesQuery.isFetching ||
    donationQuery.isFetching ||
    wasteQuery.isFetching

  const hasAnyError =
    inventoryQuery.isError || salesQuery.isError || donationQuery.isError || wasteQuery.isError

  return (
    <div className="w-full">
      <div className="relative ">
        <div className="flex items-center justify-between mb-6">
          <Typography className="text-brand-primary font-extrabold" variant="h3">
            Key Metrics Overview
          </Typography>

          <Button
            variant="outline"
            className="hover:bg-transparent"
            size="sm"
            onClick={handleRefresh}
            disabled={isAnyFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isAnyFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon="📦"
            label="Total Inventory Value"
            value={inventoryData?.totalValue ?? 0}
            productCount={inventoryData?.productCount ?? 0}
            subtitle={`${inventoryData?.batchCount ?? 0} batches`}
            isLoading={inventoryQuery.isLoading}
            isError={inventoryQuery.isError}
            isLink={true}
            link="/dashboard/inventory"
          />

          <KPICard
            icon="💰"
            label="Sales Revenue"
            value={salesData?.totalRevenue ?? 0}
            change={salesData?.change ?? 0}
            changePercent={salesData?.changePercent ?? 0}
            subtitle={`${salesData?.transactionCount ?? 0} sales`}
            isLoading={salesQuery.isLoading}
            isError={salesQuery.isError}
            isLink={true}
            link="/dashboard/outbound"
          />

          <KPICard
            icon="❤️"
            label="Donations"
            value={donationData?.totalValue ?? 0}
            change={donationData?.change ?? 0}
            changePercent={donationData?.changePercent ?? 0}
            subtitle={`${donationData?.recipientCount ?? 0} recipients`}
            isLoading={donationQuery.isLoading}
            isError={donationQuery.isError}
            isLink={true}
            link="/dashboard/donations"
          />

          <KPICard
            icon="🗑️"
            label="Waste Cost"
            value={wasteData?.totalCost ?? 0}
            change={wasteData?.change ?? 0}
            changePercent={wasteData?.changePercent ?? 0}
            subtitle={`${wasteData?.itemCount ?? 0} items`}
            isLoading={wasteQuery.isLoading}
            isError={wasteQuery.isError}
            isLink={true}
            link="/dashboard/waste"
          />
        </div>

        {/* Error state message */}
        {hasAnyError && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-white">
              Some metrics could not be loaded. Please try refreshing.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
