// hooks/use-ignored-batches.ts
// React Query hooks for ignored batch management

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'
import { toast } from 'sonner'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Summary statistics for ignored batches in a store
 */
export interface IgnoredBatchesSummary {
  total_ignored_batches: number
  total_units: number
  products_with_ignored: number
  by_category: Array<{
    category_code: string
    category_name: string
    ignored_count: number
    total_quantity: number
  }>
}

/**
 * Individual ignored batch item
 */
export interface IgnoredBatchItem {
  batch_id: string
  batch_number: string
  quantity: number
  received_date: string | null
  ignored_at: string
  created_at: string
}

/**
 * Product with its associated ignored batches
 */
export interface ProductWithIgnoredBatches {
  product_id: string
  product_name: string
  product_brand: string | null
  category_name: string | null
  typical_shelf_life_days: number | null
  ignored_batch_count: number
  total_ignored_quantity: number
  ignored_batches: IgnoredBatchItem[]
  total_count: number // Total matching products (for pagination)
}

/**
 * Result from restoring an ignored batch
 */
export interface RestoreIgnoredBatchResult {
  success: boolean
  restored_batch_id: string
  restored_quantity: number
  product_name: string
  message: string
}

/**
 * Options for fetching ignored batches by product
 */
export interface IgnoredBatchesByProductOptions extends Record<string, unknown> {
  category_codes?: string[]
  limit?: number
  offset?: number
  search?: string
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Fetch summary of ignored batches for a store
 */
async function fetchIgnoredBatchesSummary(storeId: string): Promise<IgnoredBatchesSummary> {
  const supabase = createClient()
  const context = 'fetchIgnoredBatchesSummary'

  return withPerformanceTracking(
    context,
    'Fetch ignored batches summary',
    { storeId },
    async () => {
      const { data, error } = await supabase
        .schema('inventory')
        .rpc('get_ignored_batches_summary', {
          p_store_id: storeId,
        })

      if (error) {
        logger.queryWarn(context, 'RPC error', {
          error: error.message,
          code: error.code,
          storeId,
        })
        throw new Error(`Failed to fetch ignored batches summary: ${error.message}`)
      }

      logger.log(context, 'Ignored batches summary fetched', {
        storeId,
        totalIgnored: (data as IgnoredBatchesSummary)?.total_ignored_batches || 0,
      })

      return data as IgnoredBatchesSummary
    },
  )
}

/**
 * Fetch ignored batches grouped by product
 */
async function fetchIgnoredBatchesByProduct(
  storeId: string,
  options: IgnoredBatchesByProductOptions = {},
): Promise<ProductWithIgnoredBatches[]> {
  const supabase = createClient()
  const context = 'fetchIgnoredBatchesByProduct'

  return withPerformanceTracking(
    context,
    'Fetch ignored batches by product',
    { storeId, options },
    async () => {
      const { data, error } = await supabase
        .schema('inventory')
        .rpc('get_ignored_batches_by_product', {
          p_store_id: storeId,
          p_category_codes: options.category_codes || null,
          p_limit: options.limit || null,
          p_offset: options.offset || null,
          p_search: options.search || null,
        })

      if (error) {
        logger.queryWarn(context, 'RPC error', {
          error: error.message,
          code: error.code,
          storeId,
          options,
        })
        throw new Error(`Failed to fetch ignored batches by product: ${error.message}`)
      }

      const results = (data || []) as ProductWithIgnoredBatches[]

      logger.log(context, 'Ignored batches by product fetched', {
        storeId,
        productCount: results.length,
        totalCount: results[0]?.total_count || 0,
      })

      return results
    },
  )
}

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch ignored batches summary for the active store
 *
 * @example
 * ```tsx
 * const { data: summary, isLoading } = useIgnoredBatchesSummary()
 * console.log(`${summary?.total_ignored_batches} ignored batches`)
 * ```
 */
export function useIgnoredBatchesSummary(storeId?: string) {
  const activeStoreId = useActiveStoreId()
  const effectiveStoreId = storeId || activeStoreId

  return useQuery({
    queryKey: queryKeys.batches.ignoredSummary(effectiveStoreId || ''),
    queryFn: () => fetchIgnoredBatchesSummary(effectiveStoreId!),
    enabled: !!effectiveStoreId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

/**
 * Hook to fetch ignored batches grouped by product
 *
 * @example
 * ```tsx
 * const { data: products, isLoading } = useIgnoredBatchesByProduct({
 *   category_codes: ['dairy', 'bakery'],
 *   limit: 50
 * })
 * ```
 */
export function useIgnoredBatchesByProduct(
  options: IgnoredBatchesByProductOptions = {},
  storeId?: string,
) {
  const activeStoreId = useActiveStoreId()
  const effectiveStoreId = storeId || activeStoreId

  return useQuery({
    queryKey: queryKeys.batches.ignoredByProduct(effectiveStoreId || '', options),
    queryFn: () => fetchIgnoredBatchesByProduct(effectiveStoreId!, options),
    enabled: !!effectiveStoreId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook to restore an ignored batch back to draft status
 *
 * @example
 * ```tsx
 * const { mutateAsync: restoreBatch, isPending } = useRestoreIgnoredBatch()
 *
 * await restoreBatch({
 *   batchId: 'batch-uuid',
 *   userId: 'user-uuid' // optional
 * })
 * ```
 */
export function useRestoreIgnoredBatch() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const activeStoreId = useActiveStoreId()

  return useMutation({
    mutationFn: async (params: {
      batchId: string
      userId?: string
    }): Promise<RestoreIgnoredBatchResult> => {
      const context = 'restoreIgnoredBatch'

      logger.log(context, 'Starting ignored batch restore', {
        batchId: params.batchId,
      })

      const startTime = performance.now()
      const { data, error } = await supabase.schema('inventory').rpc('restore_ignored_batch', {
        p_batch_id: params.batchId,
        p_user_id: params.userId || null,
      })
      const endTime = performance.now()

      logger.log(
        context,
        `Restore ignored batch RPC completed in ${(endTime - startTime).toFixed(2)}ms`,
        {
          success: !error,
          batchId: params.batchId,
        },
      )

      if (error) {
        logger.error(context, 'RPC error', { error, batchId: params.batchId })
        throw error
      }

      return data as RestoreIgnoredBatchResult
    },

    onSuccess: (result, _variables) => {
      if (result.success) {
        toast.success('Restored to pending', {
          description: `${result.product_name} (${result.restored_quantity} units)`,
        })

        // Invalidate both ignored and draft batches queries
        if (activeStoreId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.batches.byStore(activeStoreId),
          })

          // Invalidate products queries (stock status may have changed)
          queryClient.invalidateQueries({
            queryKey: queryKeys.products.byStore(activeStoreId),
          })
        }

        // Invalidate the restored batch detail
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.detail(result.restored_batch_id),
        })
      } else {
        toast.error('Restore failed', {
          description: result.message,
        })
      }
    },

    onError: (error: Error, variables) => {
      logger.error('restoreIgnoredBatch', 'Mutation error', {
        error,
        batchId: variables.batchId,
      })
      toast.error('Failed to restore batch', {
        description: error.message,
      })
    },
  })
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook that returns all ignored batch functionality for easy composition
 *
 * @example
 * ```tsx
 * const {
 *   summary,
 *   ignoredByProduct,
 *   restoreBatch,
 *   isRestoring
 * } = useIgnoredBatchManagement()
 * ```
 */
export function useIgnoredBatchManagement(storeId?: string) {
  const summary = useIgnoredBatchesSummary(storeId)
  const ignoredByProduct = useIgnoredBatchesByProduct({}, storeId)
  const restoreMutation = useRestoreIgnoredBatch()

  return {
    // Query data
    summary: summary.data,
    ignoredByProduct: ignoredByProduct.data,

    // Query states
    isSummaryLoading: summary.isLoading,
    isIgnoredByProductLoading: ignoredByProduct.isLoading,

    // Mutations
    restoreBatch: restoreMutation.mutateAsync,

    // Mutation states
    isRestoring: restoreMutation.isPending,

    // Raw query/mutation objects for advanced usage
    summaryQuery: summary,
    ignoredByProductQuery: ignoredByProduct,
    restoreMutation,
  }
}
