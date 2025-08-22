import { useQuery } from '@tanstack/react-query'
import { getTimeRange, type TimePeriod } from '@/components/dashboard/TimeSelector'
import {
  fetchDashboardKPITrends,
  fetchDonationKPITrends,
  fetchInventoryKPITrends,
  fetchSalesKPITrends,
  fetchWasteKPITrends,
} from '@/lib/queries/dashboard-kpi-trends'
import { useActiveStoreId } from '@/lib/stores/store-context'

export function useInventoryKPITrends(period: TimePeriod) {
  const activeStoreId = useActiveStoreId()
  const timeRange = getTimeRange(period)

  return useQuery({
    queryKey: ['kpi-trends', 'inventory', activeStoreId, period, timeRange.start, timeRange.end],
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchInventoryKPITrends(activeStoreId, timeRange)
    },
    enabled: !!activeStoreId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useSalesKPITrends(period: TimePeriod) {
  const activeStoreId = useActiveStoreId()
  const timeRange = getTimeRange(period)

  return useQuery({
    queryKey: ['kpi-trends', 'sales', activeStoreId, period, timeRange.start, timeRange.end],
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchSalesKPITrends(activeStoreId, timeRange)
    },
    enabled: !!activeStoreId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useDonationKPITrends(period: TimePeriod) {
  const activeStoreId = useActiveStoreId()
  const timeRange = getTimeRange(period)

  return useQuery({
    queryKey: ['kpi-trends', 'donations', activeStoreId, period, timeRange.start, timeRange.end],
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchDonationKPITrends(activeStoreId, timeRange)
    },
    enabled: !!activeStoreId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useWasteKPITrends(period: TimePeriod) {
  const activeStoreId = useActiveStoreId()
  const timeRange = getTimeRange(period)

  return useQuery({
    queryKey: ['kpi-trends', 'waste', activeStoreId, period, timeRange.start, timeRange.end],
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchWasteKPITrends(activeStoreId, timeRange)
    },
    enabled: !!activeStoreId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useDashboardKPITrends(period: TimePeriod) {
  const activeStoreId = useActiveStoreId()
  const timeRange = getTimeRange(period)

  return useQuery({
    queryKey: ['kpi-trends', 'all', activeStoreId, period, timeRange.start, timeRange.end],
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchDashboardKPITrends(activeStoreId, timeRange)
    },
    enabled: !!activeStoreId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}
