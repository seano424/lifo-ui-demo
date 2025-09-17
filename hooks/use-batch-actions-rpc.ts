// hooks/use-batch-actions-rpc.ts

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries/query-keys'
import { createClient } from '@/lib/supabase/client'
import type { AlertsResponse, ScoringAlert } from './use-scoring-analytics'

// Type definitions for query data
interface BatchDetail {
  batch_id: string
  current_quantity: number
  selling_price: number
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

  // Comprehensive invalidation after successful actions
  const invalidateRelatedQueries = async (batchId: string, storeId?: string) => {
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

      // Invalidate all related queries
      await Promise.all([
        // Remove from todos/alerts
        queryClient.invalidateQueries({
          queryKey: queryKeys.alerts.store(storeId),
        }),

        // Update analytics dashboard
        queryClient.invalidateQueries({
          queryKey: queryKeys.analytics.store(storeId),
        }),

        // Refresh batch details
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.detail(batchId),
        }),

        // Update store batches
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.byStore(storeId),
        }),

        // Update action history
        queryClient.invalidateQueries({
          queryKey: queryKeys.batchActions.byStore(storeId),
        }),

        // Invalidate use-scoring-analytics hooks used by todos-filtered-list tabs
        // useScoringAlerts hook - invalidate both default and threshold variants
        queryClient.invalidateQueries({
          queryKey: ['alerts', 'store', storeId],
        }),

        // useStoreAnalytics hook - invalidate all timeframes and variants
        queryClient.invalidateQueries({
          queryKey: ['analytics', 'store', storeId],
        }),

        // useTodosInfinite hook - invalidate all variations
        queryClient.invalidateQueries({
          queryKey: ['todos', 'infinite', storeId],
        }),

        // useBatchActionsInfinite hook - invalidate action history pagination
        queryClient.invalidateQueries({
          queryKey: ['batchActions', 'infinite', storeId],
        }),

        // Invalidate actionable batches specifically
        queryClient.invalidateQueries({
          queryKey: ['actionable_batches', storeId],
        }),
      ])
    }
  }

  // 1. DONATE ACTION
  const executeDonate = useMutation({
    mutationFn: async (params: DonateParams): Promise<ActionResult> => {
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
      // Optimistic update: Remove from alerts immediately
      const storeId = await getStoreIdFromBatch(variables.batchId)

      queryClient.setQueryData(
        queryKeys.alerts.store(storeId),
        (oldData: AlertsResponse | undefined) => {
          if (oldData?.alerts) {
            return {
              ...oldData,
              alerts: oldData.alerts.filter(
                (alert: ScoringAlert) => alert.batch_id !== variables.batchId,
              ),
            }
          }
          return oldData
        },
      )

      return { storeId }
    },
    onSuccess: async (result, variables, context) => {
      if (result.success) {
        toast.success(`Successfully donated ${variables.quantity} units`, {
          description: `Total value donated: €${result.total_value_donated?.toFixed(2)}`,
        })
        await invalidateRelatedQueries(variables.batchId, context?.storeId)
      } else {
        toast.error(result.error || 'Donation failed')
      }
    },
    onError: (_error, _variables, context) => {
      // Rollback optimistic update
      if (context?.storeId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.alerts.store(context.storeId),
        })
      }

      toast.error('Failed to execute donation')
    },
  })

  // 2. DISCOUNT ACTION
  const executeDiscount = useMutation({
    mutationFn: async (params: DiscountParams): Promise<ActionResult> => {
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
      // Optimistic update: Show new price immediately
      const storeId = await getStoreIdFromBatch(variables.batchId)

      queryClient.setQueryData(
        queryKeys.batches.detail(variables.batchId),
        (oldData: BatchDetail | undefined) => {
          if (oldData) {
            const newPrice = oldData.selling_price * (1 - variables.discountPercentage / 100)
            return {
              ...oldData,
              selling_price: newPrice,
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
        await invalidateRelatedQueries(variables.batchId, context?.storeId)
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
      // Optimistic update: Remove from alerts if all quantity sold
      const storeId = await getStoreIdFromBatch(variables.batchId)
      const batchData = queryClient.getQueryData(queryKeys.batches.detail(variables.batchId)) as
        | BatchDetail
        | undefined

      if (batchData && variables.quantity >= batchData.current_quantity) {
        queryClient.setQueryData(
          queryKeys.alerts.store(storeId),
          (oldData: AlertsResponse | undefined) => {
            if (oldData?.alerts) {
              return {
                ...oldData,
                alerts: oldData.alerts.filter(
                  (alert: ScoringAlert) => alert.batch_id !== variables.batchId,
                ),
              }
            }
            return oldData
          },
        )
      }

      return { storeId }
    },
    onSuccess: async (result, variables, context) => {
      if (result.success) {
        toast.success(`Marked ${variables.quantity} units as sold`, {
          description: `Revenue: €${result.revenue_recovered?.toFixed(2)}`,
        })
        await invalidateRelatedQueries(variables.batchId, context?.storeId)
      } else {
        toast.error(result.error || 'Update failed')
      }
    },
    onError: (_error, _variables, context) => {
      // Rollback optimistic update
      if (context?.storeId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.alerts.store(context.storeId),
        })
      }
      toast.error('Failed to mark as sold')
    },
  })

  // 4. DISPOSE ACTION
  const executeDispose = useMutation({
    mutationFn: async (params: DisposeParams): Promise<ActionResult> => {
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
      // Optimistic update: Remove from alerts if all quantity disposed
      const storeId = await getStoreIdFromBatch(variables.batchId)
      const batchData = queryClient.getQueryData(queryKeys.batches.detail(variables.batchId)) as
        | BatchDetail
        | undefined

      if (batchData && variables.quantity >= batchData.current_quantity) {
        queryClient.setQueryData(
          queryKeys.alerts.store(storeId),
          (oldData: AlertsResponse | undefined) => {
            if (oldData?.alerts) {
              return {
                ...oldData,
                alerts: oldData.alerts.filter(
                  (alert: ScoringAlert) => alert.batch_id !== variables.batchId,
                ),
              }
            }
            return oldData
          },
        )
      }

      return { storeId }
    },
    onSuccess: async (result, variables, context) => {
      if (result.success) {
        toast.success(`Disposed ${variables.quantity} units`, {
          description: `Reason: ${variables.disposalReason}`,
        })
        await invalidateRelatedQueries(variables.batchId, context?.storeId)
      } else {
        toast.error(result.error || 'Disposal failed')
      }
    },
    onError: (_error, _variables, context) => {
      // Rollback optimistic update
      if (context?.storeId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.alerts.store(context.storeId),
        })
      }
      toast.error('Failed to dispose items')
    },
  })

  // 5. DISMISS ACTION
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
      // Optimistic update: Remove from todos immediately
      const storeId = await getStoreIdFromBatch(variables.batchId)

      queryClient.setQueryData(
        queryKeys.alerts.store(storeId),
        (oldData: AlertsResponse | undefined) => {
          if (oldData?.alerts) {
            return {
              ...oldData,
              alerts: oldData.alerts.filter(
                (alert: ScoringAlert) => alert.batch_id !== variables.batchId,
              ),
            }
          }
          return oldData
        },
      )

      return { storeId }
    },
    onSuccess: async (result, variables, context) => {
      if (result.success) {
        toast.success('Recommendation dismissed', {
          description: `Reason: ${variables.dismissalReason}`,
        })
        await invalidateRelatedQueries(variables.batchId, context?.storeId)
      } else {
        toast.error(result.error || 'Dismiss failed')
      }
    },
    onError: (_error, _variables, context) => {
      // Rollback optimistic update
      if (context?.storeId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.alerts.store(context.storeId),
        })
      }
      toast.error('Failed to dismiss recommendation')
    },
  })

  // 6. BULK ACTION
  const executeBulk = useMutation({
    mutationFn: async (params: BulkParams): Promise<BulkActionResult> => {
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
      // Optimistic update: Remove all batches from alerts
      const storeIds = await Promise.all(
        variables.batchIds.map(batchId => getStoreIdFromBatch(batchId)),
      )
      const uniqueStoreIds = [...new Set(storeIds)]

      uniqueStoreIds.forEach(storeId => {
        if (storeId) {
          queryClient.setQueryData(
            queryKeys.alerts.store(storeId),
            (oldData: AlertsResponse | undefined) => {
              if (oldData?.alerts) {
                return {
                  ...oldData,
                  alerts: oldData.alerts.filter(
                    (alert: ScoringAlert) => !variables.batchIds.includes(alert.batch_id),
                  ),
                }
              }
              return oldData
            },
          )
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
              queryKey: queryKeys.alerts.store(storeId),
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
  DonateParams,
  DiscountParams,
  SoldParams,
  DisposeParams,
  DismissParams,
  BulkParams,
  ActionResult,
  BulkActionResult,
}
