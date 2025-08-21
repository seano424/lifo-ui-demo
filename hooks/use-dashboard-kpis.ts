import { useQuery } from '@tanstack/react-query'
import {
  fetchDashboardKPIs,
  fetchDonationKPI,
  fetchInventoryKPI,
  fetchSalesKPI,
  fetchWasteKPI,
} from '@/lib/queries/dashboard-kpis'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'

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
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
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
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
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
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
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
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
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
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}
