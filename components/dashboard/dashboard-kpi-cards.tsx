'use client'

import { KPICard } from './kpi-card'
import {
  useInventoryKPI,
  useSalesKPI,
  useDonationKPI,
  useWasteKPI,
  mockKPIData,
} from '@/hooks/use-dashboard-kpis'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { Typography } from '@/components/ui/typography'

interface DashboardKPICardsProps {
  useMockData?: boolean
}

export function DashboardKPICards({ useMockData = false }: DashboardKPICardsProps) {
  const queryClient = useQueryClient()
  const activeStoreId = useActiveStoreId()

  // Use real data or mock data based on prop
  const inventoryQuery = useInventoryKPI()
  const salesQuery = useSalesKPI()
  const donationQuery = useDonationKPI()
  const wasteQuery = useWasteKPI()

  // Use mock data if specified or if queries fail
  const inventoryData = useMockData
    ? mockKPIData.inventory
    : (inventoryQuery.data ?? mockKPIData.inventory)
  const salesData = useMockData ? mockKPIData.sales : (salesQuery.data ?? mockKPIData.sales)
  const donationData = useMockData
    ? mockKPIData.donations
    : (donationQuery.data ?? mockKPIData.donations)
  const wasteData = useMockData ? mockKPIData.waste : (wasteQuery.data ?? mockKPIData.waste)

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
    !useMockData &&
    (inventoryQuery.isFetching ||
      salesQuery.isFetching ||
      donationQuery.isFetching ||
      wasteQuery.isFetching)

  const hasAnyError =
    !useMockData &&
    (inventoryQuery.isError || salesQuery.isError || donationQuery.isError || wasteQuery.isError)

  return (
    <div className="w-full">
      <div className="relative ">
        <div className="flex items-center justify-between mb-6">
          <Typography className="text-brand-primary font-extrabold" variant="h3">
            Key Metrics Overview
          </Typography>

          {!useMockData && (
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
          )}
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon="📦"
            label="Total Inventory Value"
            value={inventoryData.totalValue}
            change={inventoryData.change}
            changePercent={inventoryData.changePercent}
            subtitle={`${inventoryData.batchCount} batches`}
            isLoading={!useMockData && inventoryQuery.isLoading}
            isError={!useMockData && inventoryQuery.isError}
            isLink={true}
            link="/dashboard/inventory"
          />

          <KPICard
            icon="💰"
            label="Sales Revenue"
            value={salesData.totalRevenue}
            change={salesData.change}
            changePercent={salesData.changePercent}
            subtitle={`${salesData.transactionCount} sales`}
            isLoading={!useMockData && salesQuery.isLoading}
            isError={!useMockData && salesQuery.isError}
            isLink={true}
            link="/dashboard/outbound"
          />

          <KPICard
            icon="❤️"
            label="Donations"
            value={donationData.totalValue}
            change={donationData.change}
            changePercent={donationData.changePercent}
            subtitle={`${donationData.recipientCount} recipients`}
            isLoading={!useMockData && donationQuery.isLoading}
            isError={!useMockData && donationQuery.isError}
            isLink={true}
            link="/dashboard/donations"
          />

          <KPICard
            icon="🗑️"
            label="Waste Cost"
            value={wasteData.totalCost}
            change={wasteData.change}
            changePercent={wasteData.changePercent}
            subtitle={`${wasteData.itemCount} items`}
            isLoading={!useMockData && wasteQuery.isLoading}
            isError={!useMockData && wasteQuery.isError}
            isLink={true}
            link="/dashboard/waste"
          />
        </div>

        {/* Error state message */}
        {hasAnyError && !useMockData && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-white">
              Some metrics could not be loaded. Showing cached data.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
