// React Query hooks for dashboard redesign
// Uses mock data layer until backend RPCs are implemented

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  fetchDashboardRedesignSummary,
  fetchTopExpiringBatches,
  fetchAutomationRules,
} from '@/lib/queries/dashboard'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'

/**
 * Hook to fetch dashboard redesign summary with KPI metrics and trends
 *
 * @param daysFilter - Time range filter (7, 30, or 90 days)
 *
 * @example
 * ```tsx
 * const { data: summary, isLoading } = useDashboardRedesignSummary(7)
 * console.log(`${summary?.expiring_count} batches expiring this week`)
 * ```
 */
export function useDashboardRedesignSummary(daysFilter: 7 | 30 | 90 = 7) {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.dashboard.redesignSummary(activeStoreId || '', daysFilter),
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchDashboardRedesignSummary(activeStoreId, daysFilter)
    },
    enabled: !!activeStoreId,
    placeholderData: keepPreviousData,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

/**
 * Hook to fetch top expiring batches for the dashboard table
 *
 * @param limit - Number of batches to fetch (default: 5)
 *
 * @example
 * ```tsx
 * const { data: batches, isLoading } = useTopExpiringBatches(5)
 * ```
 */
export function useTopExpiringBatches(limit: number = 5) {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.dashboard.expiringBatches(activeStoreId || '', limit),
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchTopExpiringBatches(activeStoreId, limit)
    },
    enabled: !!activeStoreId,
    refetchInterval: 60000, // Auto-refresh every 60 seconds (less critical)
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

/**
 * Hook to fetch automation rules for the dashboard
 *
 * @example
 * ```tsx
 * const { data: rules, isLoading } = useAutomationRules()
 * const activeRulesCount = rules?.filter(r => r.status === 'active').length
 * ```
 */
export function useAutomationRules() {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.dashboard.automationRules(activeStoreId || ''),
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchAutomationRules(activeStoreId)
    },
    enabled: !!activeStoreId,
    staleTime: 5 * 60 * 1000, // 5 minutes (rarely changes)
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}
