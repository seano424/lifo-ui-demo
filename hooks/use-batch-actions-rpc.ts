// hooks/use-batch-actions-rpc.ts

import { queryKeys } from '@/lib/queries/query-keys'
import type { TodoFilters, TodoItem } from '@/lib/queries/todos-rpc'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/use-currency'
import { ADHOC_RECIPIENT_UUID } from '@/hooks/use-donation-recipients'

// Type-safe action recommendation values (matches database enum)
export type RecommendedAction =
  | 'dispose'
  | 'discount_moderate'
  | 'discount_aggressive'
  | 'donate'
  | 'maintain'
  | 'alert'
  | 'monitor'
  | null

// Runtime type guard for RecommendedAction validation
export function isValidRecommendedAction(value: unknown): value is RecommendedAction {
  const validActions: RecommendedAction[] = [
    'dispose',
    'discount_moderate',
    'discount_aggressive',
    'donate',
    'maintain',
    'alert',
    'monitor',
    null,
  ]
  return validActions.includes(value as RecommendedAction)
}

export interface ActionableBatch {
  batch_id: string
  batch_number: string
  product_name: string
  product_brand: string
  sku: string
  expiry_date: string
  current_quantity: number
  location_code: string
  unit_price: number // Now available from database
  selling_price: number // Now available from database
  cost_price: number // Now available from database
  current_selling_price: number // Now available from database (price after discount)
  potential_loss_value: number // Fixed field name (was potential_loss)
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
  days_to_expiry: number
  ai_recommendation: string
  ai_reasoning: string
  composite_score: number
  discount_percent: number
  todo_state: 'expired' | 'urgent_action' | 'needs_attention' | 'monitor' | 'ok'
  total_count: number
  store_id?: string // Made optional since we can fetch it dynamically if needed
}

// Type for the query key structure used in the filtered todos queries
interface TodoQueryKeyParams {
  storeId: string
  filters?: TodoFilters
  pageSize?: number
}

// Type definitions for query data
interface BatchDetail {
  batch_id: string
  current_quantity: number
  selling_price: number
  current_selling_price: number
  cost_price: number
  [key: string]: unknown
}

interface BatchTodoData {
  current_quantity: number
  current_selling_price: number
  last_discount_percent: number
  [key: string]: unknown
}

interface BatchDetailData {
  current_quantity: number
  selling_price: number
  [key: string]: unknown
}

// Type definitions for RPC function parameters
interface DonateActionParams {
  p_batch_id: string
  p_quantity_affected: number
  p_donation_recipient_id?: string | undefined
  p_user_id: string
  p_notes?: string | undefined
  p_recommended_action?: string | undefined
}

interface DiscountActionParams {
  p_batch_id: string
  p_quantity_affected: number
  p_discount_percentage: number
  p_user_id: string
  p_notes?: string | undefined
  p_recommended_action?: string | undefined
}

interface SoldActionParams {
  p_batch_id: string
  p_quantity_sold: number
  p_user_id: string
  p_sale_timing?: string | undefined
  p_sale_occurred_at?: string | undefined
  p_notes?: string | undefined
  p_recommended_action?: string | undefined
}

interface DisposeActionParams {
  p_batch_id: string
  p_quantity_disposed: number
  p_disposal_reason: string
  p_user_id: string
  p_notes?: string | undefined
  p_recommended_action?: string | undefined
}

interface DismissActionParams {
  p_batch_id: string
  p_dismissal_reason: string
  p_user_id: string
  p_notes?: string | undefined
  p_recommended_action?: string | undefined
}

// RPC Return Type (all functions return this structure)
interface ActionResult {
  success: boolean
  action_id?: string
  error?: string
  remaining_quantity?: number
  total_value_donated?: number
  original_price?: number
  new_price?: number
  savings_total?: number
  revenue_recovered?: number
  total_loss_value?: number
  message?: string
}

// Bulk action result type
interface BulkActionResult {
  success: boolean
  success_count: number
  error_count: number
  results: ActionResult[]
  message?: string
}

// Hook parameter types for clean API
interface DonateParams {
  batchId: string
  quantity: number
  donationRecipientId: string
  notes?: string
  recommendedAction?: RecommendedAction
}

interface DiscountParams {
  batchId: string
  quantity: number
  discountPercentage: number
  notes?: string
  recommendedAction?: RecommendedAction
}

interface SoldParams {
  batchId: string
  quantity: number
  saleTiming?: string
  saleOccurredAt?: string | null
  notes?: string
  recommendedAction?: RecommendedAction
}

interface DisposeParams {
  batchId: string
  quantity: number
  disposalReason: string
  notes?: string
  recommendedAction?: RecommendedAction
}

interface DismissParams {
  batchId: string
  dismissalReason: string
  notes?: string
  recommendedAction?: RecommendedAction
}

interface BulkParams {
  batchIds: string[]
  actionType: 'donate' | 'discount' | 'sold' | 'dispose' | 'dismiss'
  actionParams: Record<string, unknown>
}

// Validation helper functions
const validateBatchId = (batchId: string): void => {
  if (!batchId || typeof batchId !== 'string' || batchId.trim().length === 0) {
    throw new Error('Invalid batch ID: Batch ID is required and must be a non-empty string')
  }
  // Basic UUID format validation (optional, but recommended for security)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(batchId)) {
    throw new Error('Invalid batch ID format: Must be a valid UUID')
  }
}

const validateQuantity = (quantity: number, fieldName = 'Quantity'): void => {
  if (typeof quantity !== 'number' || Number.isNaN(quantity)) {
    throw new Error(`Invalid ${fieldName}: Must be a valid number`)
  }
  if (quantity <= 0) {
    throw new Error(`Invalid ${fieldName}: Must be greater than 0`)
  }
  if (!Number.isInteger(quantity)) {
    throw new Error(`Invalid ${fieldName}: Must be a whole number`)
  }
}

const validatePercentage = (percentage: number, fieldName = 'Percentage'): void => {
  if (typeof percentage !== 'number' || Number.isNaN(percentage)) {
    throw new Error(`Invalid ${fieldName}: Must be a valid number`)
  }
  if (percentage < 0 || percentage > 100) {
    throw new Error(`Invalid ${fieldName}: Must be between 0 and 100`)
  }
}

const validateString = (value: string, fieldName: string, maxLength = 500): void => {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid ${fieldName}: ${fieldName} is required and must be a non-empty string`)
  }
  if (value.length > maxLength) {
    throw new Error(`Invalid ${fieldName}: Must be less than ${maxLength} characters`)
  }
}

export function useBatchActionRPC(providedStoreId?: string) {
  const queryClient = useQueryClient()
  const currencySymbol = useCurrency()
  const supabase = createClient()

  // Get current user ID helper
  const getCurrentUserId = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')
    return user.id
  }

  // Helper function to get store ID from batch
  const getStoreIdFromBatch = async (batchId: string): Promise<string> => {
    // If store ID was provided to the hook, use it instead of querying
    if (providedStoreId) {
      logger.log('BatchActions', 'Using provided store ID (no DB query needed)', {
        batchId,
        storeId: providedStoreId,
      })
      return providedStoreId
    }

    // Fallback to querying if no store ID provided
    logger.warn('BatchActions', 'No store ID provided, falling back to DB query', { batchId })
    const startTime = performance.now()
    const { data } = await supabase
      .schema('inventory')
      .from('batches')
      .select('store_id')
      .eq('batch_id', batchId)
      .single()
    const endTime = performance.now()
    logger.log(
      'BatchActions',
      `getStoreIdFromBatch DB query took ${(endTime - startTime).toFixed(2)}ms`,
      {
        batchId,
        storeId: data?.store_id,
      },
    )
    return data?.store_id || ''
  }

  // More targeted invalidation after successful actions
  const invalidateRelatedQueries = async (
    batchId: string,
    storeId?: string,
    actionType?: 'donate' | 'discount' | 'sold' | 'dispose' | 'dismiss',
  ) => {
    const invalidationStartTime = performance.now()
    logger.log('BatchActions', 'Starting query invalidation', { batchId, storeId, actionType })

    // Get store ID from batch if not provided
    if (!storeId) {
      storeId = await getStoreIdFromBatch(batchId)
    }

    if (storeId) {
      // Trigger scoring API to recalculate scores after batch action
      // Fire-and-forget: Don't await this since scoring can happen in background
      const scoringStartTime = performance.now()
      fetch('/api/scoring/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId,
          triggeredBy: 'batch_action',
        }),
      })
        .then(response => {
          const scoringEndTime = performance.now()
          logger.log(
            'BatchActions',
            `Scoring API (background) completed in ${(scoringEndTime - scoringStartTime).toFixed(2)}ms`,
            {
              storeId,
              status: response.status,
            },
          )
        })
        .catch(_error => {
          logger.warn('BatchActions', 'Scoring API (background) failed', { error: _error })
          // Don't fail the entire operation if scoring trigger fails
        })

      // Always invalidate core todos queries - use the actual query pattern that the hooks use
      const coreInvalidations = [
        // Invalidate all filtered todos queries (this covers pending, in-progress, completed)
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.todos.all, 'filtered'],
          predicate: query => {
            const queryKey = query.queryKey as readonly unknown[]
            const params = queryKey?.[2] as { storeId?: string } | undefined
            return params?.storeId === storeId
          },
        }),
        // Invalidate todos with counts queries (used by todos-filtered-list tabs)
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.todos.all, 'with-counts'],
          predicate: query => {
            const queryKey = query.queryKey as readonly unknown[]
            const params = queryKey?.[2] as { storeId?: string } | undefined
            return params?.storeId === storeId
          },
        }),
        // Invalidate todos counts (tab badges)
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.todos.all, 'counts'],
          predicate: query => {
            const queryKey = query.queryKey as readonly unknown[]
            const params = queryKey?.[2] as { storeId?: string } | undefined
            return params?.storeId === storeId
          },
        }),
        // Refresh specific batch details
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.detail(batchId),
        }),
        // Refresh specific batch todo data (used by BatchTable)
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.todo(batchId),
        }),
        // Update dashboard summary
        queryClient.invalidateQueries({
          queryKey: queryKeys.todos.dashboardSummary(storeId),
        }),
        // Update urgent todos count (sidebar badge)
        queryClient.invalidateQueries({
          queryKey: queryKeys.todos.urgentCount(storeId),
        }),
      ]

      // Action-specific invalidations
      const actionSpecificInvalidations = []

      if (actionType === 'donate' || actionType === 'sold' || actionType === 'dispose') {
        // These actions typically complete todos - but filtering is already covered by coreInvalidations
        // No additional invalidation needed since we're already invalidating all filtered queries
      }

      if (actionType === 'donate') {
        // Invalidate donation-specific queries
        actionSpecificInvalidations.push(
          queryClient.invalidateQueries({
            queryKey: queryKeys.donations.recipients(storeId),
          }),
        )
      }

      if (actionType === 'discount') {
        // For discounts, also update batch pricing
        actionSpecificInvalidations.push(
          queryClient.invalidateQueries({
            queryKey: queryKeys.batches.byStore(storeId),
          }),
        )
      }

      // Always update action history for completed actions
      if (actionType) {
        actionSpecificInvalidations.push(
          queryClient.invalidateQueries({
            queryKey: queryKeys.batchActions.byStore(storeId),
          }),
        )
      }

      const invalidationPromiseStart = performance.now()

      // Log which queries are being invalidated
      const filteredQueries = queryClient.getQueryCache().findAll({
        predicate: query => {
          const queryKey = query.queryKey as readonly unknown[]
          if (
            queryKey[0] === 'todos' &&
            (queryKey[1] === 'filtered' || queryKey[1] === 'with-counts')
          ) {
            const params = queryKey?.[2] as { storeId?: string } | undefined
            return params?.storeId === storeId
          }
          return false
        },
      })

      logger.log(
        'BatchActions',
        `📋 Found ${filteredQueries.length} todo queries to invalidate (filtered + with-counts)`,
        {
          storeId,
          queries: filteredQueries.map(q => ({
            key: q.queryKey,
            state: q.state.status,
            dataUpdateCount: q.state.dataUpdateCount,
          })),
        },
      )

      await Promise.all([...coreInvalidations, ...actionSpecificInvalidations])
      const invalidationPromiseEnd = performance.now()

      // Log what queries look like after invalidation
      const queriesAfterInvalidation = queryClient.getQueryCache().findAll({
        predicate: query => {
          const queryKey = query.queryKey as readonly unknown[]
          if (
            queryKey[0] === 'todos' &&
            (queryKey[1] === 'filtered' || queryKey[1] === 'with-counts')
          ) {
            const params = queryKey?.[2] as { storeId?: string } | undefined
            return params?.storeId === storeId
          }
          return false
        },
      })

      logger.log(
        'BatchActions',
        `📋 After invalidation: ${queriesAfterInvalidation.length} queries`,
        {
          storeId,
          queries: queriesAfterInvalidation.map(q => ({
            key: q.queryKey,
            state: q.state.status,
            isFetching: q.state.fetchStatus === 'fetching',
          })),
        },
      )

      const totalInvalidationTime = performance.now() - invalidationStartTime
      logger.log(
        'BatchActions',
        `Query invalidation completed in ${totalInvalidationTime.toFixed(2)}ms`,
        {
          batchId,
          storeId,
          actionType,
          promiseTime: (invalidationPromiseEnd - invalidationPromiseStart).toFixed(2),
        },
      )

      // Wait a moment for refetches to complete, then check what data we have
      setTimeout(() => {
        const batchTodoQuery = queryClient.getQueryData(queryKeys.batches.todo(batchId))
        const batchDetailQuery = queryClient.getQueryData(queryKeys.batches.detail(batchId))

        logger.log('BatchActions', '🔍 Data in cache after invalidation and refetch:', {
          batchId,
          batchTodoData: batchTodoQuery
            ? {
                current_quantity: (batchTodoQuery as BatchTodoData).current_quantity,
                current_selling_price: (batchTodoQuery as BatchTodoData).current_selling_price,
                last_discount_percent: (batchTodoQuery as BatchTodoData).last_discount_percent,
              }
            : 'no data',
          batchDetailData: batchDetailQuery
            ? {
                current_quantity: (batchDetailQuery as BatchDetailData).current_quantity,
                selling_price: (batchDetailQuery as BatchDetailData).selling_price,
              }
            : 'no data',
        })
      }, 2000) // Wait 2 seconds for refetches to complete
    }
  }

  // 1. DONATE ACTION
  const executeDonate = useMutation({
    mutationFn: async (params: DonateParams): Promise<ActionResult> => {
      // Validate inputs
      validateBatchId(params.batchId)
      validateQuantity(params.quantity, 'Donation quantity')
      validateString(params.donationRecipientId, 'Donation recipient ID')
      if (params.notes && params.notes.length > 500) {
        throw new Error('Notes must be less than 500 characters')
      }

      const userId = await getCurrentUserId()

      const rpcParams = {
        p_batch_id: params.batchId,
        p_quantity_affected: params.quantity,
        // Only pass donation_recipient_id if it's a real DB recipient (not ad-hoc)
        // Ad-hoc recipients use the placeholder UUID, which doesn't exist in DB
        // Pass null for ad-hoc recipients - the name is already in notes field
        p_donation_recipient_id:
          params.donationRecipientId && params.donationRecipientId !== ADHOC_RECIPIENT_UUID
            ? params.donationRecipientId
            : undefined,
        p_user_id: userId,
        p_notes: params.notes ?? undefined,
        p_recommended_action: params.recommendedAction ?? undefined,
      } as DonateActionParams

      logger.log('BatchActions', 'Starting donate RPC call', {
        batchId: params.batchId,
        quantity: params.quantity,
        recommendedAction: params.recommendedAction,
      })
      const startTime = performance.now()
      const { data, error } = await supabase.rpc(
        'execute_donate_action',
        rpcParams as unknown as {
          p_batch_id: string
          p_donation_recipient_id: string
          p_notes?: string | undefined
          p_quantity_affected: number
          p_recommended_action?: string | undefined
          p_user_id: string
        },
      )
      const endTime = performance.now()
      logger.log('BatchActions', `Donate RPC completed in ${(endTime - startTime).toFixed(2)}ms`, {
        success: !error,
        batchId: params.batchId,
        rpcResult: data,
      })

      if (error) {
        logger.error('BatchActions', 'Donate RPC error', { error, batchId: params.batchId })
        throw error
      }

      return data as unknown as ActionResult
    },
    onMutate: async variables => {
      // Optimistic update: Remove from pending todos immediately
      const storeId = await getStoreIdFromBatch(variables.batchId)

      // Remove from pending todos with different page sizes
      const pendingQueries = queryClient.getQueriesData({
        queryKey: [...queryKeys.todos.all, 'filtered'],
        predicate: query => {
          const queryKey = query.queryKey as readonly unknown[]
          const params = queryKey?.[2] as TodoQueryKeyParams | undefined
          return params?.storeId === storeId && params?.filters?.completion_status === 'pending'
        },
      })

      pendingQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData(
            queryKey,
            data.filter((item: TodoItem) => item.batch_id !== variables.batchId),
          )
        }
      })

      return { storeId }
    },
    onSuccess: async (result, variables, context) => {
      logger.log('BatchActions', '✅ Donate onSuccess called', {
        success: result.success,
        batchId: variables.batchId,
        quantity: variables.quantity,
        remainingQuantity: result.remaining_quantity,
        storeId: context?.storeId,
      })

      if (result.success) {
        toast.success(`Successfully donated ${variables.quantity} units`, {
          description: `Total value donated: ${currencySymbol}${result.total_value_donated?.toFixed(2)}`,
        })
        logger.log('BatchActions', '🔄 Starting query invalidation after donate')
        await invalidateRelatedQueries(variables.batchId, context?.storeId, 'donate')
        logger.log('BatchActions', '✅ Query invalidation complete after donate')
      } else {
        toast.error(result.error || 'Donation failed')
      }
    },
    onError: (_error, _variables, context) => {
      // Rollback optimistic update by invalidating pending todos
      if (context?.storeId) {
        queryClient.invalidateQueries({
          queryKey: [
            ...queryKeys.todos.all,
            'filtered',
            {
              storeId: context.storeId,
              filters: { completion_status: 'pending' },
            },
          ],
          exact: false,
        })
      }

      toast.error('Failed to execute donation')
    },
  })

  // 2. DISCOUNT ACTION
  const executeDiscount = useMutation({
    mutationFn: async (params: DiscountParams): Promise<ActionResult> => {
      // Validate inputs
      validateBatchId(params.batchId)
      validateQuantity(params.quantity, 'Discount quantity')
      validatePercentage(params.discountPercentage, 'Discount percentage')
      if (params.notes && params.notes.length > 500) {
        throw new Error('Notes must be less than 500 characters')
      }

      const userId = await getCurrentUserId()

      const rpcParams = {
        p_batch_id: params.batchId,
        p_quantity_affected: params.quantity,
        p_discount_percentage: params.discountPercentage,
        p_user_id: userId,
        p_notes: params.notes ?? undefined,
        p_recommended_action: params.recommendedAction ?? undefined,
      } as DiscountActionParams

      logger.log('BatchActions', 'Starting discount RPC call', {
        batchId: params.batchId,
        quantity: params.quantity,
        discountPercentage: params.discountPercentage,
        recommendedAction: params.recommendedAction,
      })
      const startTime = performance.now()
      const { data, error } = await supabase.rpc('execute_discount_action', rpcParams)
      const endTime = performance.now()
      logger.log(
        'BatchActions',
        `Discount RPC completed in ${(endTime - startTime).toFixed(2)}ms`,
        {
          success: !error,
          batchId: params.batchId,
          rpcResult: data,
        },
      )

      if (error) {
        logger.error('BatchActions', 'Discount RPC error', { error, batchId: params.batchId })
        throw error
      }

      return data as unknown as ActionResult
    },
    onMutate: async variables => {
      // Optimistic update: Update batch price and potentially move to in_progress
      const storeId = await getStoreIdFromBatch(variables.batchId)

      // Update batch detail with new price
      queryClient.setQueryData(
        queryKeys.batches.detail(variables.batchId),
        (oldData: TodoItem | undefined) => {
          if (oldData) {
            // Use optional chaining and nullish coalescing for safer access
            const basePrice = oldData.selling_price ?? oldData.unit_price ?? 0
            const newPrice = basePrice * (1 - variables.discountPercentage / 100)
            return {
              ...oldData,
              current_selling_price: newPrice,
              last_discount_percent: variables.discountPercentage,
            }
          }
          return oldData
        },
      )

      return { storeId }
    },
    onSuccess: async (result, variables, context) => {
      logger.log('BatchActions', '✅ Discount onSuccess called', {
        success: result.success,
        batchId: variables.batchId,
        discountPercentage: variables.discountPercentage,
        newPrice: result.new_price,
        originalPrice: result.original_price,
        storeId: context?.storeId,
      })

      if (result.success) {
        toast.success(`Applied ${variables.discountPercentage}% discount`, {
          description: `New price: ${currencySymbol}${result.new_price?.toFixed(2)}`,
        })
        logger.log('BatchActions', '🔄 Starting query invalidation after discount')
        await invalidateRelatedQueries(variables.batchId, context?.storeId, 'discount')
        logger.log('BatchActions', '✅ Query invalidation complete after discount')
      } else {
        toast.error(result.error || 'Discount failed')
      }
    },
    onError: (_error, variables, _context) => {
      // Rollback optimistic update
      queryClient.invalidateQueries({
        queryKey: queryKeys.batches.detail(variables.batchId),
      })

      toast.error('Failed to apply discount')
    },
  })

  // 3. SOLD ACTION
  const executeSold = useMutation({
    mutationFn: async (params: SoldParams): Promise<ActionResult> => {
      // Validate inputs
      validateBatchId(params.batchId)
      validateQuantity(params.quantity, 'Sold quantity')
      if (params.notes && params.notes.length > 500) {
        throw new Error('Notes must be less than 500 characters')
      }

      const userId = await getCurrentUserId()

      logger.log('BatchActions', 'Starting sold RPC call', {
        batchId: params.batchId,
        quantity: params.quantity,
        saleTiming: params.saleTiming,
        recommendedAction: params.recommendedAction,
      })
      const startTime = performance.now()
      const { data, error } = await supabase.rpc('execute_sold_action', {
        p_batch_id: params.batchId,
        p_quantity_sold: params.quantity,
        p_user_id: userId,
        p_sale_timing: params.saleTiming || 'just-now',
        p_sale_occurred_at: params.saleOccurredAt ?? undefined,
        p_notes: params.notes ?? undefined,
        p_recommended_action: params.recommendedAction ?? undefined,
      } as SoldActionParams)
      const endTime = performance.now()
      logger.log('BatchActions', `Sold RPC completed in ${(endTime - startTime).toFixed(2)}ms`, {
        success: !error,
        batchId: params.batchId,
      })

      if (error) throw error
      return data as unknown as ActionResult
    },
    onMutate: async variables => {
      // Optimistic update: Remove from pending if all quantity sold
      const storeId = await getStoreIdFromBatch(variables.batchId)
      const batchData = queryClient.getQueryData(queryKeys.batches.detail(variables.batchId)) as
        | BatchDetail
        | undefined

      if (batchData && variables.quantity >= batchData.current_quantity) {
        // Remove from pending todos (will become completed)
        const pendingQueries = queryClient.getQueriesData({
          queryKey: [...queryKeys.todos.all, 'filtered'],
          predicate: query => {
            const queryKey = query.queryKey as readonly unknown[]
            const params = queryKey?.[2] as TodoQueryKeyParams | undefined
            return params?.storeId === storeId && params?.filters?.completion_status === 'pending'
          },
        })

        pendingQueries.forEach(([queryKey, data]) => {
          if (Array.isArray(data)) {
            queryClient.setQueryData(
              queryKey,
              data.filter((item: TodoItem) => item.batch_id !== variables.batchId),
            )
          }
        })
      }

      return { storeId }
    },
    onSuccess: async (result, variables, context) => {
      if (result.success) {
        toast.success(`Marked ${variables.quantity} units as sold`, {
          description: `Revenue: ${currencySymbol}${result.revenue_recovered?.toFixed(2)}`,
        })
        await invalidateRelatedQueries(variables.batchId, context?.storeId, 'sold')
      } else {
        toast.error(result.error || 'Update failed')
      }
    },
    onError: (_error, _variables, context) => {
      // Rollback optimistic update
      if (context?.storeId) {
        queryClient.invalidateQueries({
          queryKey: [
            ...queryKeys.todos.all,
            'filtered',
            {
              storeId: context.storeId,
              filters: { completion_status: 'pending' },
            },
          ],
          exact: false,
        })
      }
      toast.error('Failed to mark as sold')
    },
  })

  // 4. DISPOSE ACTION
  const executeDispose = useMutation({
    mutationFn: async (params: DisposeParams): Promise<ActionResult> => {
      // Validate inputs
      validateBatchId(params.batchId)
      validateQuantity(params.quantity, 'Disposal quantity')
      validateString(params.disposalReason, 'Disposal reason')
      if (params.notes && params.notes.length > 500) {
        throw new Error('Notes must be less than 500 characters')
      }

      const userId = await getCurrentUserId()

      logger.log('BatchActions', 'Starting dispose RPC call', {
        batchId: params.batchId,
        quantity: params.quantity,
        disposalReason: params.disposalReason,
        recommendedAction: params.recommendedAction,
      })
      const startTime = performance.now()
      const { data, error } = await supabase.rpc('execute_dispose_action', {
        p_batch_id: params.batchId,
        p_quantity_disposed: params.quantity,
        p_disposal_reason: params.disposalReason,
        p_user_id: userId,
        p_notes: params.notes ?? undefined,
        p_recommended_action: params.recommendedAction ?? undefined,
      } as DisposeActionParams)
      const endTime = performance.now()
      logger.log('BatchActions', `Dispose RPC completed in ${(endTime - startTime).toFixed(2)}ms`, {
        success: !error,
        batchId: params.batchId,
      })

      if (error) throw error
      return data as unknown as ActionResult
    },
    onMutate: async variables => {
      // Optimistic update: Remove from pending if all quantity disposed
      const storeId = await getStoreIdFromBatch(variables.batchId)
      const batchData = queryClient.getQueryData(queryKeys.batches.detail(variables.batchId)) as
        | BatchDetail
        | undefined

      if (batchData && variables.quantity >= batchData.current_quantity) {
        // Remove from pending todos (will become completed)
        const pendingQueries = queryClient.getQueriesData({
          queryKey: [...queryKeys.todos.all, 'filtered'],
          predicate: query => {
            const queryKey = query.queryKey as readonly unknown[]
            const params = queryKey?.[2] as TodoQueryKeyParams | undefined
            return params?.storeId === storeId && params?.filters?.completion_status === 'pending'
          },
        })

        pendingQueries.forEach(([queryKey, data]) => {
          if (Array.isArray(data)) {
            queryClient.setQueryData(
              queryKey,
              data.filter((item: TodoItem) => item.batch_id !== variables.batchId),
            )
          }
        })
      }

      return { storeId }
    },
    onSuccess: async (result, variables, context) => {
      if (result.success) {
        toast.success(`Disposed ${variables.quantity} units`, {
          description: `Reason: ${variables.disposalReason}`,
        })
        await invalidateRelatedQueries(variables.batchId, context?.storeId, 'dispose')
      } else {
        toast.error(result.error || 'Disposal failed')
      }
    },
    onError: (_error, _variables, context) => {
      // Rollback optimistic update
      if (context?.storeId) {
        queryClient.invalidateQueries({
          queryKey: [
            ...queryKeys.todos.all,
            'filtered',
            {
              storeId: context.storeId,
              filters: { completion_status: 'pending' },
            },
          ],
          exact: false,
        })
      }
      toast.error('Failed to dispose items')
    },
  })

  // 5. DISMISS ACTION (unchanged)
  const executeDismiss = useMutation({
    mutationFn: async (params: DismissParams): Promise<ActionResult> => {
      const userId = await getCurrentUserId()

      logger.log('BatchActions', 'Starting dismiss RPC call', {
        batchId: params.batchId,
        dismissalReason: params.dismissalReason,
        recommendedAction: params.recommendedAction,
      })

      const { data, error } = await supabase.rpc('execute_dismiss_action', {
        p_batch_id: params.batchId,
        p_dismissal_reason: params.dismissalReason,
        p_user_id: userId,
        p_notes: params.notes ?? undefined,
        p_recommended_action: params.recommendedAction ?? undefined,
      } as DismissActionParams)

      if (error) throw error
      return data as unknown as ActionResult
    },
    onMutate: async variables => {
      // Optimistic update: Remove from pending todos immediately (dismissed = completed)
      const storeId = await getStoreIdFromBatch(variables.batchId)

      // Remove from pending todos
      const pendingQueries = queryClient.getQueriesData({
        queryKey: [...queryKeys.todos.all, 'filtered'],
        predicate: query => {
          const queryKey = query.queryKey as readonly unknown[]
          const params = queryKey?.[2] as TodoQueryKeyParams | undefined
          return params?.storeId === storeId && params?.filters?.completion_status === 'pending'
        },
      })

      pendingQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData(
            queryKey,
            data.filter((item: TodoItem) => item.batch_id !== variables.batchId),
          )
        }
      })

      return { storeId }
    },
    onSuccess: async (result, variables, context) => {
      if (result.success) {
        toast.success('Recommendation dismissed', {
          description: `Reason: ${variables.dismissalReason}`,
        })
        await invalidateRelatedQueries(variables.batchId, context?.storeId, 'dismiss')
      } else {
        toast.error(result.error || 'Dismiss failed')
      }
    },
    onError: (_error, _variables, context) => {
      // Rollback optimistic update
      if (context?.storeId) {
        queryClient.invalidateQueries({
          queryKey: [
            ...queryKeys.todos.all,
            'filtered',
            {
              storeId: context.storeId,
              filters: { completion_status: 'pending' },
            },
          ],
          exact: false,
        })
      }
      toast.error('Failed to dismiss recommendation')
    },
  })

  // 6. BULK ACTION
  const executeBulk = useMutation({
    mutationFn: async (params: BulkParams): Promise<BulkActionResult> => {
      // Validate inputs
      if (!Array.isArray(params.batchIds) || params.batchIds.length === 0) {
        throw new Error('Invalid batch IDs: Must provide at least one batch ID')
      }
      if (params.batchIds.length > 100) {
        throw new Error('Too many batch IDs: Maximum 100 batches allowed per bulk operation')
      }

      // Validate each batch ID
      params.batchIds.forEach((batchId, index) => {
        try {
          validateBatchId(batchId)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown validation error'
          throw new Error(`Invalid batch ID at position ${index + 1}: ${errorMessage}`)
        }
      })

      // Validate action type
      const validActionTypes = ['donate', 'discount', 'sold', 'dispose', 'dismiss']
      if (!validActionTypes.includes(params.actionType)) {
        throw new Error(`Invalid action type: Must be one of ${validActionTypes.join(', ')}`)
      }

      // Validate action params
      if (!params.actionParams || typeof params.actionParams !== 'object') {
        throw new Error('Invalid action parameters: Must be a valid object')
      }

      const userId = await getCurrentUserId()

      const { data, error } = await supabase.rpc('execute_bulk_action', {
        p_batch_ids: params.batchIds,
        p_action_type: params.actionType,
        p_action_params: params.actionParams as unknown as string | number | boolean | null,
        p_user_id: userId,
      })

      if (error) throw error
      return data as unknown as BulkActionResult
    },
    onMutate: async variables => {
      // Optimistic update: Remove all batches from pending todos
      const storeIds = await Promise.all(
        variables.batchIds.map(batchId => getStoreIdFromBatch(batchId)),
      )
      const uniqueStoreIds = [...new Set(storeIds)]

      uniqueStoreIds.forEach(storeId => {
        if (storeId) {
          // Remove from pending todos
          const pendingQueries = queryClient.getQueriesData({
            queryKey: [...queryKeys.todos.all, 'filtered'],
            predicate: query => {
              const queryKey = query.queryKey as readonly unknown[]
              const params = queryKey?.[2] as TodoQueryKeyParams | undefined
              return params?.storeId === storeId && params?.filters?.completion_status === 'pending'
            },
          })

          pendingQueries.forEach(([queryKey, data]) => {
            if (Array.isArray(data)) {
              queryClient.setQueryData(
                queryKey,
                data.filter((item: TodoItem) => !variables.batchIds.includes(item.batch_id || '')),
              )
            }
          })
        }
      })

      return { storeIds: uniqueStoreIds }
    },
    onSuccess: async (result, variables, _context) => {
      if (result.success) {
        toast.success(`Bulk action completed: ${result.success_count} successful`, {
          description:
            result.error_count > 0 ? `${result.error_count} items failed` : 'All items processed',
        })
      } else {
        toast.warning(
          `Bulk action: ${result.success_count} succeeded, ${result.error_count} failed`,
        )
      }

      // Invalidate queries for all affected batches
      await Promise.all(variables.batchIds.map(batchId => invalidateRelatedQueries(batchId)))
    },
    onError: (_error, _variables, context) => {
      // Rollback optimistic updates
      if (context?.storeIds) {
        context.storeIds.forEach(storeId => {
          if (storeId) {
            queryClient.invalidateQueries({
              queryKey: [
                ...queryKeys.todos.all,
                'filtered',
                { storeId, filters: { completion_status: 'pending' } },
              ],
              exact: false,
            })
          }
        })
      }
      toast.error('Bulk action failed')
    },
  })

  return {
    // Individual actions
    executeDonate: executeDonate.mutateAsync,
    executeDiscount: executeDiscount.mutateAsync,
    executeSold: executeSold.mutateAsync,
    executeDispose: executeDispose.mutateAsync,
    executeDismiss: executeDismiss.mutateAsync,

    // Bulk action
    executeBulk: executeBulk.mutateAsync,

    // Loading states
    isDonating: executeDonate.isPending,
    isDiscounting: executeDiscount.isPending,
    isMarkingSold: executeSold.isPending,
    isDisposing: executeDispose.isPending,
    isDismissing: executeDismiss.isPending,
    isBulkProcessing: executeBulk.isPending,

    // Global loading state
    isProcessing:
      executeDonate.isPending ||
      executeDiscount.isPending ||
      executeSold.isPending ||
      executeDispose.isPending ||
      executeDismiss.isPending ||
      executeBulk.isPending,

    // Raw mutation objects for advanced usage
    donateMutation: executeDonate,
    discountMutation: executeDiscount,
    soldMutation: executeSold,
    disposeMutation: executeDispose,
    dismissMutation: executeDismiss,
    bulkMutation: executeBulk,
  }
}

// Export types for use in components
export type {
  ActionResult,
  BulkActionResult,
  BulkParams,
  DiscountParams,
  DismissParams,
  DisposeParams,
  DonateParams,
  SoldParams,
}
