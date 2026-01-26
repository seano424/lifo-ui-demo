// hooks/use-draft-batches.ts
// React Query hooks for LIFO batch creation and draft batch management

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'
import { toast } from 'sonner'
import { useRestoreIgnoredBatch } from './use-ignored-batches'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Summary statistics for draft batches in a store
 */
export interface DraftBatchesSummary {
  total_draft_batches: number
  total_units: number
  products_with_drafts: number
  by_category: Array<{
    category_code: string
    category_name: string
    draft_count: number
    total_quantity: number
  }>
}

/**
 * Individual draft batch item
 */
export interface DraftBatchItem {
  batch_id: string
  batch_number: string
  quantity: number
  received_date: string | null
  created_at: string
}

/**
 * Product with its associated draft batches
 */
export interface ProductWithDraftBatches {
  product_id: string
  product_name: string
  product_brand: string | null
  category_name: string | null
  typical_shelf_life_days: number | null
  draft_batch_count: number
  total_draft_quantity: number
  draft_batches: DraftBatchItem[]
  last_expiry_days: number | null
  last_batch_expiry_date: string | null
  total_count: number // Total matching products (for pagination)
}

/**
 * Result from activating a draft batch
 */
export interface ActivateDraftBatchResult {
  success: boolean
  activated_batch_id: string
  activated_quantity: number
  expiry_date: string
  was_split: boolean
  remaining_draft_batch_id: string | null
  remaining_draft_quantity: number | null
  message: string
}

/**
 * Result from ignoring a draft batch
 */
export interface IgnoreDraftBatchResult {
  success: boolean
  ignored_batch_id: string
  ignored_quantity: number
  product_name: string
  was_split: boolean
  remaining_draft_batch_id: string | null
  remaining_draft_quantity: number | null
  message: string
}

/**
 * Item for delivery logging
 */
export interface DeliveryItem {
  product_id: string
  quantity: number
}

/**
 * Individual item result from delivery logging
 */
export interface DeliveryItemResult {
  product_id: string
  product_name: string
  quantity: number
  draft_batch_id: string
  suggested_expiry_days: number | null
  suggested_expiry_date: string | null
}

/**
 * Result from logging a delivery
 */
export interface LogDeliveryResult {
  success: boolean
  total_items: number
  drafts_created: number
  items: DeliveryItemResult[]
}

/**
 * Recent delivery product information
 */
export interface RecentDeliveryProduct {
  product_id: string
  product_name: string
  last_delivery_quantity: number
  last_expiry_days: number | null
  total_delivery_count: number
}

/**
 * Options for fetching draft batches by product
 */
export interface DraftBatchesByProductOptions {
  category_codes?: string[]
  limit?: number
  offset?: number
  search?: string
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Fetch summary of draft batches for a store
 */
async function fetchDraftBatchesSummary(storeId: string): Promise<DraftBatchesSummary> {
  const supabase = createClient()
  const context = 'fetchDraftBatchesSummary'

  return withPerformanceTracking(context, 'Fetch draft batches summary', { storeId }, async () => {
    const { data, error } = await supabase.schema('inventory').rpc('get_draft_batches_summary', {
      p_store_id: storeId,
    })

    if (error) {
      logger.queryWarn(context, 'RPC error', {
        error: error.message,
        code: error.code,
        storeId,
      })
      throw new Error(`Failed to fetch draft batches summary: ${error.message}`)
    }

    logger.log(context, 'Draft batches summary fetched', {
      storeId,
      totalDrafts: (data as DraftBatchesSummary)?.total_draft_batches || 0,
    })

    return data as DraftBatchesSummary
  })
}

/**
 * Fetch draft batches grouped by product
 */
async function fetchDraftBatchesByProduct(
  storeId: string,
  options: DraftBatchesByProductOptions = {},
): Promise<ProductWithDraftBatches[]> {
  const supabase = createClient()
  const context = 'fetchDraftBatchesByProduct'

  return withPerformanceTracking(
    context,
    'Fetch draft batches by product',
    { storeId, options },
    async () => {
      const { data, error } = await supabase
        .schema('inventory')
        .rpc('get_draft_batches_by_product', {
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
        throw new Error(`Failed to fetch draft batches by product: ${error.message}`)
      }

      const results = (data || []) as ProductWithDraftBatches[]

      logger.log(context, 'Draft batches by product fetched', {
        storeId,
        productCount: results.length,
        totalCount: results[0]?.total_count || 0,
      })

      return results
    },
  )
}

/**
 * Fetch recent delivery products for quick re-delivery
 */
async function fetchRecentDeliveryProducts(
  storeId: string,
  limit: number = 20,
): Promise<RecentDeliveryProduct[]> {
  const supabase = createClient()
  const context = 'fetchRecentDeliveryProducts'

  return withPerformanceTracking(
    context,
    'Fetch recent delivery products',
    { storeId, limit },
    async () => {
      const { data, error } = await supabase
        .schema('inventory')
        .rpc('get_recent_delivery_products', {
          p_store_id: storeId,
          p_limit: limit,
        })

      if (error) {
        logger.queryWarn(context, 'RPC error', {
          error: error.message,
          code: error.code,
          storeId,
          limit,
        })
        throw new Error(`Failed to fetch recent delivery products: ${error.message}`)
      }

      const results = (data || []) as RecentDeliveryProduct[]

      logger.log(context, 'Recent delivery products fetched', {
        storeId,
        productCount: results.length,
      })

      return results
    },
  )
}

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch draft batches summary for the active store
 *
 * @example
 * ```tsx
 * const { data: summary, isLoading } = useDraftBatchesSummary()
 * console.log(`${summary?.total_draft_batches} draft batches pending`)
 * ```
 */
export function useDraftBatchesSummary(storeId?: string) {
  const activeStoreId = useActiveStoreId()
  const effectiveStoreId = storeId || activeStoreId

  return useQuery({
    queryKey: queryKeys.batches.draftSummary(effectiveStoreId || ''),
    queryFn: () => fetchDraftBatchesSummary(effectiveStoreId!),
    enabled: !!effectiveStoreId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

/**
 * Hook to fetch draft batches grouped by product
 *
 * @example
 * ```tsx
 * const { data: products, isLoading } = useDraftBatchesByProduct({
 *   category_codes: ['dairy', 'bakery'],
 *   limit: 50
 * })
 * ```
 */
export function useDraftBatchesByProduct(
  options: DraftBatchesByProductOptions = {},
  storeId?: string,
) {
  const activeStoreId = useActiveStoreId()
  const effectiveStoreId = storeId || activeStoreId

  return useQuery({
    queryKey: queryKeys.batches.draftsByProduct(effectiveStoreId || '', options),
    queryFn: () => fetchDraftBatchesByProduct(effectiveStoreId!, options),
    enabled: !!effectiveStoreId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook to fetch recent delivery products for quick re-delivery
 *
 * @example
 * ```tsx
 * const { data: recentProducts } = useRecentDeliveryProducts(10)
 * ```
 */
export function useRecentDeliveryProducts(limit: number = 20, storeId?: string) {
  const activeStoreId = useActiveStoreId()
  const effectiveStoreId = storeId || activeStoreId

  return useQuery({
    queryKey: queryKeys.batches.recentDeliveries(effectiveStoreId || '', limit),
    queryFn: () => fetchRecentDeliveryProducts(effectiveStoreId!, limit),
    enabled: !!effectiveStoreId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to activate a draft batch with an expiry date
 *
 * @example
 * ```tsx
 * const { mutateAsync: activateBatch, isPending } = useActivateDraftBatch()
 *
 * await activateBatch({
 *   batchId: 'batch-uuid',
 *   expiryDate: '2025-02-01',
 *   quantity: 10, // optional - activates partial quantity
 *   userId: 'user-uuid' // optional
 * })
 * ```
 */
export function useActivateDraftBatch() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const activeStoreId = useActiveStoreId()

  return useMutation({
    mutationFn: async (params: {
      batchId: string
      expiryDate: string
      quantity?: number
      userId?: string
    }): Promise<ActivateDraftBatchResult> => {
      const context = 'activateDraftBatch'

      logger.log(context, 'Starting draft batch activation', {
        batchId: params.batchId,
        expiryDate: params.expiryDate,
        quantity: params.quantity,
      })

      const startTime = performance.now()
      const { data, error } = await supabase.schema('inventory').rpc('activate_draft_batch', {
        p_batch_id: params.batchId,
        p_expiry_date: params.expiryDate,
        p_quantity: params.quantity || null,
        p_user_id: params.userId || null,
      })
      const endTime = performance.now()

      logger.log(
        context,
        `Activate draft batch RPC completed in ${(endTime - startTime).toFixed(2)}ms`,
        {
          success: !error,
          batchId: params.batchId,
        },
      )

      if (error) {
        logger.error(context, 'RPC error', { error, batchId: params.batchId })
        throw error
      }

      return data as ActivateDraftBatchResult
    },

    onSuccess: (result, _variables) => {
      if (result.success) {
        const message = result.was_split
          ? `Activated ${result.activated_quantity} units. ${result.remaining_draft_quantity} units remain in draft.`
          : `Successfully activated batch with expiry date ${result.expiry_date}`

        toast.success('Draft batch activated', {
          description: message,
        })

        // Invalidate draft batches queries
        if (activeStoreId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.batches.byStore(activeStoreId),
          })

          // Invalidate todo counts (expiry counts will change when batches are activated)
          queryClient.invalidateQueries({
            queryKey: queryKeys.todos.all,
          })

          // Invalidate products queries (stock levels changed)
          queryClient.invalidateQueries({
            queryKey: queryKeys.products.byStore(activeStoreId),
          })
        }

        // Invalidate the activated batch detail
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.detail(result.activated_batch_id),
        })

        // If batch was split, also invalidate the remaining draft batch
        if (result.was_split && result.remaining_draft_batch_id) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.batches.detail(result.remaining_draft_batch_id),
          })
        }
      } else {
        toast.error('Activation failed', {
          description: result.message,
        })
      }
    },

    onError: (error: Error, variables) => {
      logger.error('activateDraftBatch', 'Mutation error', {
        error,
        batchId: variables.batchId,
      })
      toast.error('Failed to activate draft batch', {
        description: error.message,
      })
    },
  })
}

/**
 * Hook to ignore a draft batch (mark as not needed)
 *
 * @example
 * ```tsx
 * const { mutateAsync: ignoreBatch, isPending } = useIgnoreDraftBatch()
 *
 * await ignoreBatch({
 *   batchId: 'batch-uuid',
 *   quantity: 10, // optional - ignores partial quantity
 *   userId: 'user-uuid' // optional
 * })
 * ```
 */
export function useIgnoreDraftBatch() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const activeStoreId = useActiveStoreId()
  const { mutateAsync: restoreBatch } = useRestoreIgnoredBatch()

  return useMutation({
    mutationFn: async (params: {
      batchId: string
      quantity?: number
      userId?: string
    }): Promise<IgnoreDraftBatchResult> => {
      const context = 'ignoreDraftBatch'

      logger.log(context, 'Starting draft batch ignore', {
        batchId: params.batchId,
        quantity: params.quantity,
      })

      const startTime = performance.now()
      const { data, error } = await supabase.schema('inventory').rpc('ignore_draft_batch', {
        p_batch_id: params.batchId,
        p_quantity: params.quantity || null,
        p_user_id: params.userId || null,
      })
      const endTime = performance.now()

      logger.log(
        context,
        `Ignore draft batch RPC completed in ${(endTime - startTime).toFixed(2)}ms`,
        {
          success: !error,
          batchId: params.batchId,
        },
      )

      if (error) {
        logger.error(context, 'RPC error', { error, batchId: params.batchId })
        throw error
      }

      return data as IgnoreDraftBatchResult
    },

    onMutate: async params => {
      if (!activeStoreId) return

      // Cancel outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: queryKeys.batches.draftsByProduct(activeStoreId, {}),
      })

      // Snapshot previous value for rollback
      const previousDrafts = queryClient.getQueryData(
        queryKeys.batches.draftsByProduct(activeStoreId, {}),
      )

      // Optimistically remove batch from the list
      queryClient.setQueryData(
        queryKeys.batches.draftsByProduct(activeStoreId, {}),
        (old: ProductWithDraftBatches[] | undefined) => {
          if (!old) return old

          return old
            .map(product => ({
              ...product,
              draft_batches: product.draft_batches.filter(b => b.batch_id !== params.batchId),
              draft_batch_count: product.draft_batches.filter(b => b.batch_id !== params.batchId)
                .length,
              total_draft_quantity: product.draft_batches
                .filter(b => b.batch_id !== params.batchId)
                .reduce((sum, b) => sum + b.quantity, 0),
            }))
            .filter(p => p.draft_batches.length > 0) // Remove products with no drafts
        },
      )

      return { previousDrafts }
    },

    onSuccess: (result, _variables) => {
      if (result.success) {
        const message = result.was_split
          ? `${result.ignored_quantity} units moved to ignored. ${result.remaining_draft_quantity} units remain in draft.`
          : `${result.ignored_quantity} units moved to ignored`

        toast.success(`${result.product_name} ignored`, {
          description: message,
          action: {
            label: 'Undo',
            onClick: () => {
              restoreBatch({ batchId: result.ignored_batch_id })
            },
          },
          duration: 5000,
        })

        // Invalidate all batch queries for the store
        if (activeStoreId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.batches.byStore(activeStoreId),
          })

          // Invalidate products queries (stock levels changed)
          queryClient.invalidateQueries({
            queryKey: queryKeys.products.byStore(activeStoreId),
          })
        }

        // Invalidate the ignored batch detail
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.detail(result.ignored_batch_id),
        })

        // If batch was split, also invalidate the remaining draft batch
        if (result.was_split && result.remaining_draft_batch_id) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.batches.detail(result.remaining_draft_batch_id),
          })
        }
      } else {
        toast.error('Failed to ignore batch', {
          description: result.message,
        })
      }
    },

    onError: (error: Error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousDrafts && activeStoreId) {
        queryClient.setQueryData(
          queryKeys.batches.draftsByProduct(activeStoreId, {}),
          context.previousDrafts,
        )
      }

      logger.error('ignoreDraftBatch', 'Mutation error', {
        error,
        batchId: variables.batchId,
      })
      toast.error('Failed to ignore draft batch', {
        description: error.message,
      })
    },
  })
}

/**
 * Hook to log a delivery and create draft batches
 *
 * @example
 * ```tsx
 * const { mutateAsync: logDelivery, isPending } = useLogDelivery()
 *
 * const result = await logDelivery({
 *   items: [
 *     { product_id: 'product-1', quantity: 24 },
 *     { product_id: 'product-2', quantity: 12 }
 *   ]
 * })
 * ```
 */
export function useLogDelivery() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const activeStoreId = useActiveStoreId()

  return useMutation({
    mutationFn: async (params: {
      items: DeliveryItem[]
      userId?: string
    }): Promise<LogDeliveryResult> => {
      const context = 'logDelivery'

      if (!activeStoreId) {
        throw new Error('No active store selected')
      }

      if (!params.items || params.items.length === 0) {
        throw new Error('At least one delivery item is required')
      }

      // Get current user if userId not provided
      let userId = params.userId
      if (!userId) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('User not authenticated')
        }
        userId = user.id
      }

      logger.log(context, 'Starting delivery logging', {
        storeId: activeStoreId,
        itemCount: params.items.length,
        userId,
      })

      const startTime = performance.now()
      const { data, error } = await supabase.schema('inventory').rpc('log_delivery_create_drafts', {
        p_store_id: activeStoreId,
        p_user_id: userId,
        p_items: params.items,
      })
      const endTime = performance.now()

      logger.log(context, `Log delivery RPC completed in ${(endTime - startTime).toFixed(2)}ms`, {
        success: !error,
        storeId: activeStoreId,
        itemCount: params.items.length,
      })

      if (error) {
        logger.error(context, 'RPC error', { error, storeId: activeStoreId })
        throw error
      }

      return data as LogDeliveryResult
    },

    onSuccess: (result, _variables) => {
      if (result.success) {
        toast.success('Delivery logged successfully', {
          description: `Created ${result.drafts_created} draft batch${result.drafts_created !== 1 ? 'es' : ''} for ${result.total_items} product${result.total_items !== 1 ? 's' : ''}`,
        })

        // Invalidate all batch-related queries for the store
        if (activeStoreId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.batches.byStore(activeStoreId),
          })

          // Invalidate product queries as stock levels changed
          queryClient.invalidateQueries({
            queryKey: queryKeys.products.byStore(activeStoreId),
          })

          // Invalidate recent deliveries query
          queryClient.invalidateQueries({
            queryKey: queryKeys.batches.recentDeliveries(activeStoreId),
          })
        }
      } else {
        toast.warning('Delivery partially logged', {
          description: `${result.drafts_created} of ${result.total_items} items processed`,
        })
      }
    },

    onError: (error: Error, variables) => {
      logger.error('logDelivery', 'Mutation error', {
        error,
        itemCount: variables.items.length,
        storeId: activeStoreId,
      })
      toast.error('Failed to log delivery', {
        description: error.message,
      })
    },
  })
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook that returns all draft batch functionality for easy composition
 *
 * @example
 * ```tsx
 * const {
 *   summary,
 *   draftsByProduct,
 *   recentProducts,
 *   activateBatch,
 *   ignoreBatch,
 *   logDelivery,
 *   isActivating,
 *   isIgnoring,
 *   isLoggingDelivery
 * } = useDraftBatchManagement()
 * ```
 */
export function useDraftBatchManagement(storeId?: string) {
  const summary = useDraftBatchesSummary(storeId)
  const draftsByProduct = useDraftBatchesByProduct({}, storeId)
  const recentProducts = useRecentDeliveryProducts(20, storeId)
  const activateMutation = useActivateDraftBatch()
  const ignoreMutation = useIgnoreDraftBatch()
  const logDeliveryMutation = useLogDelivery()

  return {
    // Query data
    summary: summary.data,
    draftsByProduct: draftsByProduct.data,
    recentProducts: recentProducts.data,

    // Query states
    isSummaryLoading: summary.isLoading,
    isDraftsByProductLoading: draftsByProduct.isLoading,
    isRecentProductsLoading: recentProducts.isLoading,

    // Mutations
    activateBatch: activateMutation.mutateAsync,
    ignoreBatch: ignoreMutation.mutateAsync,
    logDelivery: logDeliveryMutation.mutateAsync,

    // Mutation states
    isActivating: activateMutation.isPending,
    isIgnoring: ignoreMutation.isPending,
    isLoggingDelivery: logDeliveryMutation.isPending,

    // Raw query/mutation objects for advanced usage
    summaryQuery: summary,
    draftsByProductQuery: draftsByProduct,
    recentProductsQuery: recentProducts,
    activateMutation,
    ignoreMutation,
    logDeliveryMutation,
  }
}
