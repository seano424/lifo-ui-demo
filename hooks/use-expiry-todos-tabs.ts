import type { TodoFilters } from '@/lib/queries/todos-rpc'
import { useTodosWithCountsInfinite } from './use-todos-with-filters'

/**
 * Hook for "Expiring Today" tab (0-1 days to expiry)
 * Note: Does NOT filter by lifecycle_status to match the count RPC
 */
export function useExpiringTodayTodos(
  additionalFilters?: Omit<
    TodoFilters,
    'lifecycle_status' | 'days_to_expiry_min' | 'days_to_expiry_max'
  >,
  pageSize: number = 20,
) {
  return useTodosWithCountsInfinite(
    {
      days_to_expiry_min: 0,
      days_to_expiry_max: 1,
      ...additionalFilters,
    },
    pageSize,
  )
}

/**
 * Hook for "Expiring Soon" tab (2-3 days to expiry)
 * Note: Does NOT filter by lifecycle_status to match the count RPC
 */
export function useExpiringSoonTodos(
  additionalFilters?: Omit<
    TodoFilters,
    'lifecycle_status' | 'days_to_expiry_min' | 'days_to_expiry_max'
  >,
  pageSize: number = 20,
) {
  return useTodosWithCountsInfinite(
    {
      days_to_expiry_min: 2,
      days_to_expiry_max: 3,
      ...additionalFilters,
    },
    pageSize,
  )
}

/**
 * Hook for "Expiring This Week" tab (4-7 days to expiry)
 * Note: Does NOT filter by lifecycle_status to match the count RPC
 */
export function useExpiringWeekTodos(
  additionalFilters?: Omit<
    TodoFilters,
    'lifecycle_status' | 'days_to_expiry_min' | 'days_to_expiry_max'
  >,
  pageSize: number = 20,
) {
  return useTodosWithCountsInfinite(
    {
      days_to_expiry_min: 4,
      days_to_expiry_max: 7,
      ...additionalFilters,
    },
    pageSize,
  )
}

/**
 * Hook for "Expired" tab (past expiry date, negative days_to_expiry)
 * Note: Uses days_to_expiry_max < 0 to match the count RPC
 * Does NOT use lifecycle_status filter
 */
export function useExpiredTodos(
  additionalFilters?: Omit<
    TodoFilters,
    'lifecycle_status' | 'days_to_expiry_min' | 'days_to_expiry_max'
  >,
  pageSize: number = 20,
) {
  return useTodosWithCountsInfinite(
    {
      days_to_expiry_max: -1,
      ...additionalFilters,
    },
    pageSize,
  )
}
