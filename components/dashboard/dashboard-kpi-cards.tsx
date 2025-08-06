'use client'

import { KPICard } from './kpi-card'
import {
  useInventoryKPI,
  useSalesKPI,
  useDonationKPI,
  useWasteKPI,
  mockKPIData,
} from '@/hooks/use-dashboard-kpis'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface DashboardKPICardsProps {
  onCardClick?: (cardType: 'inventory' | 'sales' | 'donations' | 'waste') => void
  useMockData?: boolean
}

export function DashboardKPICards({ 
  onCardClick, 
  useMockData = false 
}: DashboardKPICardsProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const activeStoreId = useActiveStoreId()

  // Use real data or mock data based on prop
  const inventoryQuery = useInventoryKPI()
  const salesQuery = useSalesKPI()
  const donationQuery = useDonationKPI()
  const wasteQuery = useWasteKPI()

  // Use mock data if specified or if queries fail
  const inventoryData = useMockData ? mockKPIData.inventory : (inventoryQuery.data ?? mockKPIData.inventory)
  const salesData = useMockData ? mockKPIData.sales : (salesQuery.data ?? mockKPIData.sales)
  const donationData = useMockData ? mockKPIData.donations : (donationQuery.data ?? mockKPIData.donations)
  const wasteData = useMockData ? mockKPIData.waste : (wasteQuery.data ?? mockKPIData.waste)

  const handleCardClick = (type: 'inventory' | 'sales' | 'donations' | 'waste') => {
    if (onCardClick) {
      onCardClick(type)
    } else {
      // Default navigation
      switch (type) {
        case 'inventory':
          router.push('/dashboard/inventory')
          break
        case 'sales':
          router.push('/dashboard/outbound')
          break
        case 'donations':
          router.push('/dashboard/donations')
          break
        case 'waste':
          router.push('/dashboard/waste')
          break
      }
    }
  }

  const handleRefresh = () => {
    if (activeStoreId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardKPIs.byStore(activeStoreId),
      })
    }
  }

  const isAnyLoading = !useMockData && (
    inventoryQuery.isLoading || 
    salesQuery.isLoading || 
    donationQuery.isLoading || 
    wasteQuery.isLoading
  )

  const hasAnyError = !useMockData && (
    inventoryQuery.isError || 
    salesQuery.isError || 
    donationQuery.isError || 
    wasteQuery.isError
  )

  return (
    <div className="w-full">
      {/* Purple gradient background section */}
      <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-2xl p-8 shadow-xl">
        {/* Header with refresh button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Key Performance Indicators</h2>
            <p className="text-purple-100 text-sm mt-1">Real-time metrics for your store</p>
          </div>
          
          {!useMockData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-white hover:bg-white/10"
              disabled={isAnyLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isAnyLoading ? 'animate-spin' : ''}`} />
              <span className="ml-2">Refresh</span>
            </Button>
          )}
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon="📦"
            label="Inventory Value"
            value={inventoryData.totalValue}
            change={inventoryData.change}
            changePercent={inventoryData.changePercent}
            subtitle={`${inventoryData.batchCount} batches`}
            isLoading={!useMockData && inventoryQuery.isLoading}
            isError={!useMockData && inventoryQuery.isError}
            onClick={() => handleCardClick('inventory')}
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
            onClick={() => handleCardClick('sales')}
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
            onClick={() => handleCardClick('donations')}
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
            onClick={() => handleCardClick('waste')}
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