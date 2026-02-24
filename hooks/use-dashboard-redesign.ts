// React Query hooks for dashboard redesign

import { useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchDashboardRedesignSummary, fetchTopExpiringBatches } from '@/lib/queries/dashboard'
import { useCategoriesWithTrackingSettings } from '@/lib/queries/batch-tracking-onboarding'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'
import type { AutomationRule } from '@/lib/queries/dashboard'

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
 * Hook to fetch automation rules for the dashboard.
 *
 * Rules are derived from batch tracking category settings:
 * a "rule" is any category with auto_create_batches === true.
 * Cache is shared with the batch tracking onboarding flow, so mutations there
 * (useSaveBatchTrackingSetup) automatically refresh this data.
 *
 * @example
 * ```tsx
 * const { data: rules, isLoading } = useAutomationRules()
 * console.log(`${rules.length} active rules`)
 * ```
 */
export function useAutomationRules() {
  const activeStoreId = useActiveStoreId()
  const categoriesQuery = useCategoriesWithTrackingSettings(activeStoreId || '')

  const rules = useMemo((): AutomationRule[] => {
    if (!categoriesQuery.data) return []
    return categoriesQuery.data
      .filter(cat => cat.auto_create_batches)
      .map(cat => ({
        rule_id: cat.category_id,
        name: cat.display_name_en,
        type: 'category' as const,
        products_count: cat.product_count,
        shelf_life_days: cat.default_shelf_life_days,
      }))
  }, [categoriesQuery.data])

  return {
    data: rules,
    isLoading: categoriesQuery.isLoading,
    error: categoriesQuery.error,
  }
}
