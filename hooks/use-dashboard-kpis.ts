// hooks/use-dashboard-kpis.ts

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'
import {
  fetchInventoryKPI,
  fetchSalesKPI,
  fetchDonationKPI,
  fetchWasteKPI,
  fetchDashboardKPIs,
  type DashboardKPIs,
} from '@/lib/queries/dashboard-kpis'

// Individual KPI hooks for granular control
export function useInventoryKPI() {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.dashboardKPIs.inventory(activeStoreId || ''),
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchInventoryKPI(activeStoreId)
    },
    enabled: !!activeStoreId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useSalesKPI() {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.dashboardKPIs.sales(activeStoreId || ''),
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchSalesKPI(activeStoreId)
    },
    enabled: !!activeStoreId,
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useDonationKPI() {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.dashboardKPIs.donations(activeStoreId || ''),
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchDonationKPI(activeStoreId)
    },
    enabled: !!activeStoreId,
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useWasteKPI() {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.dashboardKPIs.waste(activeStoreId || ''),
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchWasteKPI(activeStoreId)
    },
    enabled: !!activeStoreId,
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// Combined hook for all KPIs (most efficient - fetches all at once)
export function useDashboardKPIs() {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.dashboardKPIs.byStore(activeStoreId || ''),
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchDashboardKPIs(activeStoreId)
    },
    enabled: !!activeStoreId,
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// Mock data for development/testing
export const mockKPIData: DashboardKPIs = {
  inventory: {
    totalValue: 12450,
    batchCount: 142,
    change: 120,
    changePercent: 0.97,
  },
  sales: {
    totalRevenue: 3568,
    transactionCount: 23,
    change: 450,
    changePercent: 14.4,
  },
  donations: {
    totalValue: 890,
    recipientCount: 5,
    change: 45,
    changePercent: 5.3,
  },
  waste: {
    totalCost: 340,
    itemCount: 3,
    change: -220,
    changePercent: -39.3,
  },
}

// Utility hook to get mock data for development/testing
export function useMockDashboardKPIs(): { data: DashboardKPIs; isLoading: false; error: null } {
  return {
    data: mockKPIData,
    isLoading: false,
    error: null,
  }
}