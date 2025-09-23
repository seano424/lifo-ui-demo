// hooks/use-batch-actions-rpc.ts

import { queryKeys } from '@/lib/queries/query-keys'
import type { TodoFilters, TodoItem } from '@/lib/queries/todos-rpc'
import { createClient } from '@/lib/supabase/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

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

// Type definitions for RPC function parameters
interface DonateActionParams {
  p_batch_id: string
  p_quantity_affected: number
  p_donation_recipient_id: string
  p_user_id: string
  p_notes?: string | null
}

interface DiscountActionParams {
  p_batch_id: string
  p_quantity_affected: number
  p_discount_percentage: number
  p_user_id: string
  p_notes?: string | null
}

interface SoldActionParams {
  p_batch_id: string
  p_quantity_sold: number
  p_user_id: string
  p_notes?: string | null
}

interface DisposeActionParams {
  p_batch_id: string
  p_quantity_disposed: number
  p_disposal_reason: string
  p_user_id: string
  p_notes?: string | null
}

interface DismissActionParams {
  p_batch_id: string
  p_dismissal_reason: string
  p_user_id: string
  p_notes?: string | null
}

interface BulkActionParams {
  p_batch_ids: string[]
  p_action_type: 'donate' | 'discount' | 'sold' | 'dispose' | 'dismiss'
  p_action_params: Record<string, unknown>
  p_user_id: string
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
}

interface DiscountParams {
  batchId: string
  quantity: number
  discountPercentage: number
  notes?: string
}

interface SoldParams {
  batchId: string
  quantity: number
  notes?: string
}

interface DisposeParams {
  batchId: string
  quantity: number
  disposalReason: string
  notes?: string
}

interface DismissParams {
  batchId: string
  dismissalReason: string
  notes?: string
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

export function useBatchActionRPC() {
  const queryClient = useQueryClient()
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
    const { data } = await supabase
      .schema('inventory')
      .from('batches')
      .select('store_id')
      .eq('batch_id', batchId)
      .single()
    return data?.store_id || ''
  }

  // More targeted invalidation after successful actions
  const invalidateRelatedQueries = async (
    batchId: string,
    storeId?: string,
    actionType?: 'donate' | 'discount' | 'sold' | 'dispose' | 'dismiss',
  ) => {
    // Get store ID from batch if not provided
    if (!storeId) {
      storeId = await getStoreIdFromBatch(batchId)
    }

    if (storeId) {
      // Trigger scoring API to recalculate scores after batch action
      try {
        await fetch('/api/scoring/trigger', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            storeId,
            triggeredBy: 'batch_action',
          }),
        })
      } catch (_error) {
        // Don't fail the entire operation if scoring trigger fails
      }

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
        // Refresh specific batch details
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.detail(batchId),
        }),
        // Update dashboard summary
        queryClient.invalidateQueries({
          queryKey: queryKeys.todos.dashboardSummary(storeId),
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
            queryKey: ['donation-recipients', storeId],
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

      await Promise.all([...coreInvalidations, ...actionSpecificInvalidations])
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
        p_donation_recipient_id: params.donationRecipientId,
        p_user_id: userId,
        p_notes: params.notes || null,
      } as DonateActionParams

      const { data, error } = await supabase.rpc('execute_donate_action', rpcParams)

      if (error) {
        throw error
      }

      return data as ActionResult
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
      if (result.success) {
        toast.success(`Successfully donated ${variables.quantity} units`, {
          description: `Total value donated: €${result.total_value_donated?.toFixed(2)}`,
        })
        await invalidateRelatedQueries(variables.batchId, context?.storeId, 'donate')
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
        p_notes: params.notes || null,
      } as DiscountActionParams

      const { data, error } = await supabase.rpc('execute_discount_action', rpcParams)

      if (error) {
        throw error
      }

      return data as ActionResult
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
      if (result.success) {
        toast.success(`Applied ${variables.discountPercentage}% discount`, {
          description: `New price: €${result.new_price?.toFixed(2)}`,
        })
        await invalidateRelatedQueries(variables.batchId, context?.storeId, 'discount')
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

      const { data, error } = await supabase.rpc('execute_sold_action', {
        p_batch_id: params.batchId,
        p_quantity_sold: params.quantity,
        p_user_id: userId,
        p_notes: params.notes || null,
      } as SoldActionParams)

      if (error) throw error
      return data as ActionResult
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
          description: `Revenue: €${result.revenue_recovered?.toFixed(2)}`,
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

      const { data, error } = await supabase.rpc('execute_dispose_action', {
        p_batch_id: params.batchId,
        p_quantity_disposed: params.quantity,
        p_disposal_reason: params.disposalReason,
        p_user_id: userId,
        p_notes: params.notes || null,
      } as DisposeActionParams)

      if (error) throw error
      return data as ActionResult
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

      const { data, error } = await supabase.rpc('execute_dismiss_action', {
        p_batch_id: params.batchId,
        p_dismissal_reason: params.dismissalReason,
        p_user_id: userId,
        p_notes: params.notes || null,
      } as DismissActionParams)

      if (error) throw error
      return data as ActionResult
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
        p_action_params: params.actionParams,
        p_user_id: userId,
      } as BulkActionParams)

      if (error) throw error
      return data as BulkActionResult
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
                data.filter((item: TodoItem) => !variables.batchIds.includes(item.batch_id)),
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
