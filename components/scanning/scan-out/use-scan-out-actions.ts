import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries/query-keys'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

// Batch type from database
type BatchRow = Database['inventory']['Tables']['batches']['Row']

// Custom type for available batches with nested structure
interface AvailableBatch {
  batch: BatchRow
  products: {
    product_name: string
    brand_name: string
    barcode: string
    category_name?: string
  }
}

interface CheckoutItem {
  batchId: string
  quantityRemoved: number
  reason: 'scan-out' | 'sale' | 'waste' | 'transfer' | 'expired'
  storeId: string
  notes?: string
}

interface CheckoutResult {
  success: boolean
  successCount?: number
  failureCount?: number
  message: string
  results: Array<{
    batchId: string
    success: boolean
    error?: string
  }>
}

// Type for RPC function results
interface BatchRPCResult {
  batch_id: string
  batch_number: string | null
  product_id: string
  store_id: string
  expiry_date: string
  current_quantity: number
  available_quantity: number
  cost_price: number
  selling_price: number
  location_code: string | null
  status: string
  created_at: string
  product_name: string
  brand_name: string | null
  product_barcode: string
  category_name: string | null
}

interface StoreAccessResult {
  user_id: string
  role_in_store: string
  is_active: boolean
}

interface BatchUpdateResult {
  success: boolean
  new_quantity: number
  error_message: string | null
}

/**
 * Hook for scan-out specific actions:
 * - Finding available inventory batches by barcode and store
 * - Processing checkout/removal transactions
 * - Updating inventory quantities
 */
export function useScanOutActions() {
  const queryClient = useQueryClient()

  /**
   * Match a captured expiry date to an available batch
   * Returns the batch with the closest matching expiry date, or null if no match
   */
  const matchBatchByExpiry = (
    batches: AvailableBatch[],
    capturedExpiryDate: string,
  ): AvailableBatch | null => {
    if (!batches.length) return null

    // Parse the captured date
    let targetDate: Date
    try {
      targetDate = new Date(capturedExpiryDate)
      if (Number.isNaN(targetDate.getTime())) {
        return null
      }
    } catch (_error) {
      return null
    }

    // Find exact match first
    const exactMatch = batches.find(availableBatch => {
      const batchDate = new Date(availableBatch.batch.expiry_date)
      return (
        batchDate.getFullYear() === targetDate.getFullYear() &&
        batchDate.getMonth() === targetDate.getMonth() &&
        batchDate.getDate() === targetDate.getDate()
      )
    })

    if (exactMatch) return exactMatch

    // If no exact match, find the closest date (within 7 days)
    const TOLERANCE_DAYS = 7
    const toleranceMs = TOLERANCE_DAYS * 24 * 60 * 60 * 1000

    let closestBatch: AvailableBatch | null = null
    let smallestDifference = Infinity

    for (const availableBatch of batches) {
      const batchDate = new Date(availableBatch.batch.expiry_date)
      const difference = Math.abs(batchDate.getTime() - targetDate.getTime())

      if (difference <= toleranceMs && difference < smallestDifference) {
        smallestDifference = difference
        closestBatch = availableBatch
      }
    }

    return closestBatch
  }

  /**
   * Find available inventory batches for a product by barcode and store
   * Uses RPC function to avoid schema syntax issues
   */
  const findAvailableBatches = async (
    barcode: string,
    storeId: string,
  ): Promise<AvailableBatch[]> => {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('find_available_batches_by_barcode', {
        barcode_param: barcode,
        store_id_param: storeId,
      })

      if (error) {
        console.error('RPC batch lookup failed:', error)
        throw new Error(`Failed to fetch available inventory: ${error.message}`)
      }

      if (!data || data.length === 0) {
        return []
      }

      // Transform to nested structure with batch and products
      return data.map((rpcResult: BatchRPCResult): AvailableBatch => {
        const currentQty = Number(rpcResult.current_quantity)
        const availableQty = rpcResult.available_quantity
          ? Number(rpcResult.available_quantity)
          : currentQty

        return {
          batch: {
            batch_id: rpcResult.batch_id,
            batch_number: rpcResult.batch_number || '',
            product_id: rpcResult.product_id,
            store_id: rpcResult.store_id,
            expiry_date: rpcResult.expiry_date,
            current_quantity: currentQty,
            available_quantity: availableQty,
            cost_price: Number(rpcResult.cost_price),
            selling_price: Number(rpcResult.selling_price),
            location_code: rpcResult.location_code,
            status: rpcResult.status,
            created_at: rpcResult.created_at,
            // Additional required fields from BatchRow type
            initial_quantity: currentQty,
            received_date: null,
            reserved_quantity: null,
            updated_at: rpcResult.created_at,
            manufacture_date: null,
            supplier: null,
            ocr_extracted_date: null,
            ocr_confidence: null,
            processing_batch_id: null,
            batch_source: null,
            scanned_barcode: null,
            scan_confidence: null,
            verification_status: 'verified' as const,
            created_by: null,
          },
          products: {
            product_name: rpcResult.product_name || 'Unknown Product',
            brand_name: rpcResult.brand_name || 'Unknown Brand',
            barcode: rpcResult.product_barcode || barcode,
            category_name: rpcResult.category_name || undefined,
          },
        }
      })
    } catch (error) {
      console.error('Error in findAvailableBatches:', error)
      throw error
    }
  }

  /**
   * Process checkout/removal of items from inventory
   * Uses RPC functions to avoid schema syntax issues
   */
  const checkoutMutation = useMutation({
    mutationFn: async (items: CheckoutItem[]): Promise<CheckoutResult> => {
      const supabase = createClient()
      const results: CheckoutResult['results'] = []
      let successCount = 0
      let failureCount = 0

      // Authentication check
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        console.error('Authentication Error:', authError)
        throw new Error('User not authenticated. Please sign in and try again.')
      }

      // Store access check using RPC function
      if (items.length > 0 && items[0].storeId) {
        const { data: storeAccessData, error: storeAccessError } = await supabase.rpc(
          'check_store_access',
          {
            user_id_param: user.id,
            store_id_param: items[0].storeId,
          },
        )

        if (storeAccessError) {
          console.error('Store access check failed:', storeAccessError)
          throw new Error('Failed to verify store access')
        }

        const storeAccess = storeAccessData?.[0] as StoreAccessResult | undefined

        if (!storeAccess || !storeAccess.is_active) {
          console.error('Store Access Denied:', {
            storeId: items[0].storeId,
            userId: user.id,
          })
          throw new Error('You do not have active access to this store')
        }
      }

      // Process each item in the checkout using RPC function
      for (const item of items) {
        try {
          const { data: updateResults, error: updateError } = await supabase.rpc(
            'update_batch_quantity',
            {
              batch_id_param: item.batchId,
              quantity_to_remove: item.quantityRemoved,
              reason_param: item.reason,
            },
          )

          if (updateError) {
            console.error('Batch update RPC failed:', updateError)
            results.push({
              batchId: item.batchId,
              success: false,
              error: updateError.message,
            })
            failureCount++
            continue
          }

          const updateResult = updateResults?.[0] as BatchUpdateResult | undefined

          if (!updateResult || !updateResult.success) {
            results.push({
              batchId: item.batchId,
              success: false,
              error: updateResult?.error_message || 'Update failed',
            })
            failureCount++
            continue
          }

          results.push({
            batchId: item.batchId,
            success: true,
          })
          successCount++
        } catch (error) {
          console.error(`Error processing checkout for batch ${item.batchId}:`, error)
          results.push({
            batchId: item.batchId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          failureCount++
        }
      }

      return {
        success: successCount > 0,
        successCount,
        failureCount,
        message:
          failureCount === 0
            ? `Successfully removed ${successCount} items from inventory`
            : `Processed ${successCount} items successfully, ${failureCount} failed`,
        results,
      }
    },

    onSuccess: (result, items) => {
      if (result.success) {
        // Invalidate relevant queries to refresh the UI
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.all,
        })

        if (items.length > 0 && items[0].storeId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.batches.byStore(items[0].storeId),
          })

          queryClient.invalidateQueries({
            queryKey: queryKeys.products.byStore(items[0].storeId),
          })
        }

        queryClient.invalidateQueries({
          queryKey: queryKeys.productLookup.all,
        })

        // Show success message
        if (result.failureCount === 0) {
          toast.success(`Successfully removed ${result.successCount} items from inventory`)
        } else {
          toast.warning(result.message)
        }
      } else {
        toast.error('All removals failed')
      }
    },

    onError: (error: Error) => {
      console.error('Checkout failed:', error)
      toast.error(`Checkout failed: ${error.message}`)
    },
  })

  return {
    // Functions
    findAvailableBatches,
    matchBatchByExpiry,
    submitCheckout: checkoutMutation.mutate,
    submitCheckoutAsync: checkoutMutation.mutateAsync,

    // State
    isSubmittingCheckout: checkoutMutation.isPending,
    checkoutResult: checkoutMutation.data,
    checkoutError: checkoutMutation.error,

    // Expose mutation for advanced usage
    checkoutMutation,
  }
}
