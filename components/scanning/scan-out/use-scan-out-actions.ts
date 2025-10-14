import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries/query-keys'
import { createClient } from '@/lib/supabase/client'
import type { AvailableBatch, CheckoutItem, CheckoutResult } from '@/types/scanning'

// Type for RPC function results
interface BatchRPCResult {
  batch_id: string
  batch_number: string
  product_id: string
  store_id: string
  expiry_date: string
  current_quantity: number
  available_quantity: number | null
  initial_quantity: number
  cost_price: number
  selling_price: number
  location_code: string | null
  status: string
  verification_status: string | null
  created_at: string
  product_name: string
  brand_name: string | null
  product_barcode: string
  category_name: string | null
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
        const initialQty = Number(rpcResult.initial_quantity)
        const availableQty = rpcResult.available_quantity
          ? Number(rpcResult.available_quantity)
          : currentQty

        return {
          batch: {
            batch_id: rpcResult.batch_id,
            batch_number: rpcResult.batch_number,
            product_id: rpcResult.product_id,
            store_id: rpcResult.store_id,
            expiry_date: rpcResult.expiry_date,
            current_quantity: currentQty,
            available_quantity: availableQty,
            initial_quantity: initialQty,
            cost_price: Number(rpcResult.cost_price),
            selling_price: Number(rpcResult.selling_price),
            location_code: rpcResult.location_code,
            status: rpcResult.status,
            verification_status: rpcResult.verification_status,
            created_at: rpcResult.created_at,
            // Additional required fields not returned by RPC (for full BatchRow compliance)
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
   * Uses batch RPC function for optimal performance (single DB call vs N calls)
   */
  const checkoutMutation = useMutation({
    mutationFn: async (items: CheckoutItem[]): Promise<CheckoutResult> => {
      const supabase = createClient()

      if (items.length === 0) {
        throw new Error('No items to checkout')
      }

      // Authentication check
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        console.error('Authentication Error:', authError)
        throw new Error('User not authenticated. Please sign in and try again.')
      }

      const storeId = items[0].storeId

      // Process all items in a single batch RPC call (13x faster than loop)
      const { data: batchResults, error: batchError } = await supabase.rpc(
        'batch_update_quantities',
        {
          p_items: items.map(item => ({
            batch_id: item.batchId,
            quantity: item.quantityRemoved,
            action_type: item.actionType, // Use the new action_type field (sold/donate/dispose)
            action_reason: item.reason || 'scan-out', // Keep for backward compatibility
            notes: item.notes || '',
          })),
          p_store_id: storeId,
        },
      )

      if (batchError) {
        console.error('Batch update failed:', batchError)
        throw new Error(`Checkout failed: ${batchError.message}`)
      }

      // The RPC returns an object with results array, not a direct array
      if (!batchResults || typeof batchResults !== 'object') {
        console.error('Invalid batch results:', batchResults)
        throw new Error('No results returned from batch update')
      }

      // Type the response from the RPC
      const response = batchResults as {
        results: Array<{
          batch_id: string
          success: boolean
          new_quantity: number | null
          error_message: string | null
        }>
        success: boolean
        store_id: string
        timestamp: string
        processed_count: number
      }

      if (!response.results || response.results.length === 0) {
        console.error('No results in batch response:', response)
        throw new Error('No results returned from batch update')
      }

      // Process results
      const results: CheckoutResult['results'] = response.results.map(result => ({
        batchId: result.batch_id,
        success: result.success,
        error: result.error_message || undefined,
      }))

      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length

      // Debug logging
      console.log('[DEBUG] Processed results:', {
        totalItems: results.length,
        successCount,
        failureCount,
        results,
        individualResults: response.results,
        firstResultDetail: response.results[0],
        errorMessages: response.results.map(r => r.error_message),
      })

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
        const storeId = items[0]?.storeId

        // Only invalidate affected store's data (not all stores)
        if (storeId) {
          // Invalidate this store's batches (more targeted than invalidating all batches)
          queryClient.invalidateQueries({
            queryKey: queryKeys.batches.byStore(storeId),
          })

          // Invalidate store-specific dashboard data
          queryClient.invalidateQueries({
            queryKey: ['dashboard', storeId],
          })

          // Invalidate store-specific product queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.products.byStore(storeId),
          })
        }

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
