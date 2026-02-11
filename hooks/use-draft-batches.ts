// hooks/use-draft-batches.ts
// React Query hooks for lifo batch creation and draft batch management

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'
import { validateRpcResult, validateRpcArray } from '@/lib/utils/rpc-types'
import { toast } from 'sonner'
import { useRestoreIgnoredBatch } from './use-ignored-batches'
import { safeParseJsonb } from '@/lib/validation/jsonb-validators'
import {
  DraftBatchesSummaryResponseSchema,
  DraftBatchesByProductSchema,
  ActivateDraftBatchResponseSchema,
  IgnoreDraftBatchResponseSchema,
} from '@/lib/validation/rpc-schemas'
import type {
  DraftBatchesSummaryResponse,
  DraftBatchItem,
  DraftBatchesByProduct,
  ActivateDraftBatchResponse,
  IgnoreDraftBatchResponse,
} from '@/types/rpc-returns'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Re-export types from centralized location for backwards compatibility
export type {
  DraftBatchesSummaryResponse as DraftBatchesSummary,
  DraftBatchItem,
  DraftBatchesByProduct as ProductWithDraftBatches,
  ActivateDraftBatchResponse as ActivateDraftBatchResult,
  IgnoreDraftBatchResponse as IgnoreDraftBatchResult,
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
async function fetchDraftBatchesSummary(storeId: string): Promise<DraftBatchesSummaryResponse> {
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

    const result = validateRpcResult(data, DraftBatchesSummaryResponseSchema, context)

    logger.log(context, 'Draft batches summary fetched', {
      storeId,
      totalDrafts: result?.total_draft_batches || 0,
    })

    return result
  })
}

/**
 * Fetch draft batches grouped by product
 */
async function fetchDraftBatchesByProduct(
  storeId: string,
  options: DraftBatchesByProductOptions = {},
): Promise<DraftBatchesByProduct[]> {
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
          p_category_codes: options.category_codes ?? undefined,
          p_limit: options.limit ?? undefined,
          p_offset: options.offset ?? undefined,
          p_search: options.search ?? undefined,
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

      const results = validateRpcArray(data, DraftBatchesByProductSchema, context)

      logger.log(context, 'Draft batches by product fetched', {
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
    }): Promise<ActivateDraftBatchResponse> => {
      const context = 'activateDraftBatch'

      // Check user authentication and authorization
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Verify user has permission to manage batches for this store
      const { data: storeUser, error: permissionError } = await supabase
        .schema('business')
        .from('store_users')
        .select('role_in_store, permissions, is_active')
        .eq('store_id', activeStoreId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (permissionError || !storeUser) {
        logger.error(context, 'Permission check failed', { error: permissionError })
        throw new Error('You do not have permission to manage batches for this store')
      }

      // Check if user has permission to manage batches
      // Validate JSONB permissions with runtime validation
      const permissionsResult = safeParseJsonb.storeUserPermissions(storeUser.permissions || {})
      const permissions = permissionsResult.success ? permissionsResult.data : {}

      const canManageBatches =
        storeUser.role_in_store === 'owner' ||
        storeUser.role_in_store === 'manager' ||
        (permissions.can_upload_inventory ?? false)

      if (!canManageBatches) {
        throw new Error('You do not have permission to activate batches')
      }

      logger.log(context, 'Starting draft batch activation', {
        batchId: params.batchId,
        expiryDate: params.expiryDate,
        quantity: params.quantity,
      })

      const startTime = performance.now()
      const { data, error } = await supabase.schema('inventory').rpc('activate_draft_batch', {
        p_batch_id: params.batchId,
        p_expiry_date: params.expiryDate,
        p_quantity: params.quantity ?? undefined,
        p_user_id: params.userId ?? undefined,
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

      return validateRpcResult(data, ActivateDraftBatchResponseSchema, context)
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
        if (result.activated_batch_id) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.batches.detail(result.activated_batch_id),
          })
        }

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
    }): Promise<IgnoreDraftBatchResponse> => {
      const context = 'ignoreDraftBatch'

      // Check user authentication and authorization
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Verify user has permission to manage batches for this store
      const { data: storeUser, error: permissionError } = await supabase
        .schema('business')
        .from('store_users')
        .select('role_in_store, permissions, is_active')
        .eq('store_id', activeStoreId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (permissionError || !storeUser) {
        logger.error(context, 'Permission check failed', { error: permissionError })
        throw new Error('You do not have permission to manage batches for this store')
      }

      // Check if user has permission to manage batches
      // Validate JSONB permissions with runtime validation
      const permissionsResult = safeParseJsonb.storeUserPermissions(storeUser.permissions || {})
      const permissions = permissionsResult.success ? permissionsResult.data : {}

      const canManageBatches =
        storeUser.role_in_store === 'owner' ||
        storeUser.role_in_store === 'manager' ||
        (permissions.can_upload_inventory ?? false)

      if (!canManageBatches) {
        throw new Error('You do not have permission to ignore batches')
      }

      logger.log(context, 'Starting draft batch ignore', {
        batchId: params.batchId,
        quantity: params.quantity,
      })

      const startTime = performance.now()
      const { data, error } = await supabase.schema('inventory').rpc('ignore_draft_batch', {
        p_batch_id: params.batchId,
        p_quantity: params.quantity ?? undefined,
        p_user_id: params.userId ?? undefined,
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

      return validateRpcResult(data, IgnoreDraftBatchResponseSchema, context)
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
        (old: DraftBatchesByProduct[] | undefined) => {
          if (!old) return old

          return old
            .map(product => ({
              ...product,
              draft_batches: product.draft_batches.filter(
                (b: DraftBatchItem) => b.batch_id !== params.batchId,
              ),
              draft_batch_count: product.draft_batches.filter(
                (b: DraftBatchItem) => b.batch_id !== params.batchId,
              ).length,
              total_draft_quantity: product.draft_batches
                .filter((b: DraftBatchItem) => b.batch_id !== params.batchId)
                .reduce((sum: number, b: DraftBatchItem) => sum + b.quantity, 0),
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
          action: result.ignored_batch_id
            ? {
                label: 'Undo',
                onClick: () => {
                  restoreBatch({ batchId: result.ignored_batch_id! })
                },
              }
            : undefined,
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
        if (result.ignored_batch_id) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.batches.detail(result.ignored_batch_id),
          })
        }

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
 *   activateBatch,
 *   ignoreBatch,
 *   isActivating,
 *   isIgnoring
 * } = useDraftBatchManagement()
 * ```
 */
export function useDraftBatchManagement(storeId?: string) {
  const summary = useDraftBatchesSummary(storeId)
  const draftsByProduct = useDraftBatchesByProduct({}, storeId)
  const activateMutation = useActivateDraftBatch()
  const ignoreMutation = useIgnoreDraftBatch()

  return {
    // Query data
    summary: summary.data,
    draftsByProduct: draftsByProduct.data,

    // Query states
    isSummaryLoading: summary.isLoading,
    isDraftsByProductLoading: draftsByProduct.isLoading,

    // Mutations
    activateBatch: activateMutation.mutateAsync,
    ignoreBatch: ignoreMutation.mutateAsync,

    // Mutation states
    isActivating: activateMutation.isPending,
    isIgnoring: ignoreMutation.isPending,

    // Raw query/mutation objects for advanced usage
    summaryQuery: summary,
    draftsByProductQuery: draftsByProduct,
    activateMutation,
    ignoreMutation,
  }
}
