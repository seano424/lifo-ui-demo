/**
 * React Query hooks for store inventory stats
 *
 * Provides reactive hooks for querying the store_inventory_stats view
 * with automatic caching, refetching, and state management via TanStack Query
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import {
  fetchStoreInventoryStats,
  fetchProductInventoryStats,
  fetchIncompleteBatchesCount,
  fetchProductsNeedingExpiryDates,
  fetchStoreSummaryStats,
} from '@/lib/queries/store-inventory-stats'
import type { Database } from '@/types/supabase'

type StoreInventoryStats = Database['inventory']['Views']['store_inventory_stats']['Row']

/**
 * Hook to fetch inventory stats for a store
 * Optionally filter by product_id
 */
export function useStoreInventoryStats(
  storeId: string,
  productId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['store-inventory-stats', storeId, productId],
    queryFn: () => fetchStoreInventoryStats(storeId, productId),
    enabled: options?.enabled !== false && !!storeId,
    staleTime: 1000 * 60, // 1 minute - stats change frequently
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook to fetch inventory stats for a single product
 */
export function useProductInventoryStats(
  storeId: string,
  productId: string,
  options?: { enabled?: boolean }
): UseQueryResult<StoreInventoryStats | null, Error> {
  return useQuery({
    queryKey: ['product-inventory-stats', storeId, productId],
    queryFn: () => fetchProductInventoryStats(storeId, productId),
    enabled: options?.enabled !== false && !!storeId && !!productId,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook to fetch count of incomplete batches (draft batches needing expiry dates)
 * Used for dashboard alerts and notifications
 */
export function useIncompleteBatchesCount(
  storeId: string,
  options?: { enabled?: boolean }
): UseQueryResult<number, Error> {
  return useQuery({
    queryKey: ['incomplete-batches-count', storeId],
    queryFn: () => fetchIncompleteBatchesCount(storeId),
    enabled: options?.enabled !== false && !!storeId,
    staleTime: 1000 * 30, // 30 seconds - important metric
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  })
}

/**
 * Hook to fetch products that need expiry dates (have draft batches)
 * Used for incomplete batches list/workflow
 */
export function useProductsNeedingExpiryDates(
  storeId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['products-needing-expiry-dates', storeId],
    queryFn: () => fetchProductsNeedingExpiryDates(storeId),
    enabled: options?.enabled !== false && !!storeId,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook to fetch summary stats for a store
 * Used for dashboard overview
 */
export function useStoreSummaryStats(
  storeId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['store-summary-stats', storeId],
    queryFn: () => fetchStoreSummaryStats(storeId),
    enabled: options?.enabled !== false && !!storeId,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  })
}
