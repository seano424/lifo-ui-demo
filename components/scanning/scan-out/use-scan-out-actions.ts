import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries/query-keys'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { AvailableBatch, CheckoutItem, CheckoutResult } from '@/types/scanning'
import { ADHOC_RECIPIENT_UUID } from '@/hooks/use-donation-recipients'

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
  lifecycle_status: string | null
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
        logger.error('ScanOut', 'RPC batch lookup failed', { error })
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
            lifecycle_status: rpcResult.lifecycle_status || null,
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
      logger.error('ScanOut', 'Error in findAvailableBatches', { error })
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
        logger.error('ScanOut', 'Authentication error', { error: authError })
        throw new Error('User not authenticated. Please sign in and try again.')
      }

      const storeId = items[0].storeId

      // Log the request payload for debugging
      const rpcPayload = {
        p_items: items.map(item => {
          // Build notes field: include recipient name for ad-hoc donations
          let notesField = item.notes || ''

          // If this is a donation action and we have a recipient name, include it in notes
          if (item.actionType === 'donate' && item.donationRecipientName) {
            // Check if this is an ad-hoc recipient (UUID is special placeholder)
            const isAdhoc = item.donationRecipientId === ADHOC_RECIPIENT_UUID

            if (isAdhoc) {
              // For ad-hoc recipients, prepend the recipient name to notes
              const recipientNote = `Recipient: ${item.donationRecipientName}`
              notesField = notesField ? `${recipientNote} | ${notesField}` : recipientNote
            }
          }

          const recipientId =
            item.actionType === 'donate' &&
            item.donationRecipientId &&
            item.donationRecipientId !== ADHOC_RECIPIENT_UUID
              ? item.donationRecipientId
              : null

          // Debug log to verify the fix is working
          if (item.actionType === 'donate') {
            logger.log('ScanOut', 'Donation recipient handling', {
              originalId: item.donationRecipientId,
              isAdhoc: item.donationRecipientId === ADHOC_RECIPIENT_UUID,
              finalIdToSend: recipientId,
              recipientName: item.donationRecipientName,
              ADHOC_UUID: ADHOC_RECIPIENT_UUID,
            })
          }

          return {
            batch_id: item.batchId,
            quantity: item.quantityRemoved,
            action_type: item.actionType, // Use the new action_type field (sold/donate/dispose)
            action_reason: item.reason || 'scan-out', // Keep for backward compatibility
            notes: notesField,
            // Only pass donation_recipient_id if it's a real DB recipient (not ad-hoc)
            // Ad-hoc recipients use the placeholder UUID, which doesn't exist in DB
            // Pass null for ad-hoc recipients - the name is already in notes field
            donation_recipient_id: recipientId,
            disposal_reason: item.disposalReason, // Required for 'dispose' action
          }
        }),
        p_store_id: storeId,
      }

      logger.log('ScanOut', 'RPC Request', {
        function: 'batch_update_quantities',
        storeId,
        itemCount: items.length,
        payload: rpcPayload,
        itemDetails: items.map(item => ({
          batchId: item.batchId,
          actionType: item.actionType,
          quantity: item.quantityRemoved,
        })),
      })

      // Process all items in a single batch RPC call (13x faster than loop)
      const { data: batchResults, error: batchError } = await supabase.rpc(
        'batch_update_quantities',
        rpcPayload,
      )

      if (batchError) {
        logger.error('ScanOut', 'RPC Error', {
          error: batchError,
          message: batchError.message,
          details: batchError.details,
          hint: batchError.hint,
          code: batchError.code,
          payload: rpcPayload,
        })
        throw new Error(`Checkout failed: ${batchError.message}`)
      }

      // The RPC returns an object with results array, not a direct array
      if (!batchResults || typeof batchResults !== 'object') {
        logger.error('ScanOut', 'Invalid batch results', { batchResults })
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
        logger.error('ScanOut', 'No results in batch response', { response })
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

      // Enhanced logging with success/failure breakdown
      logger.log('ScanOut', 'RPC Response', {
        totalItems: results.length,
        successCount,
        failureCount,
        rawResponse: response,
      })

      // Log successful items
      const successfulItems = response.results.filter(r => r.success)
      if (successfulItems.length > 0) {
        logger.log('ScanOut', 'Successful items', {
          count: successfulItems.length,
          items: successfulItems.map(r => ({
            batchId: r.batch_id,
            newQuantity: r.new_quantity,
          })),
        })
      }

      // Log failed items with detailed error info
      const failedItems = response.results.filter(r => !r.success)
      if (failedItems.length > 0) {
        logger.error('ScanOut', 'Failed items', {
          count: failedItems.length,
          items: failedItems.map(r => ({
            batchId: r.batch_id,
            error: r.error_message,
            // Try to match with original item for more context
            originalItem: items.find(item => item.batchId === r.batch_id),
          })),
        })

        // Log each failure individually for visibility
        failedItems.forEach((failedItem, index) => {
          const originalItem = items.find(item => item.batchId === failedItem.batch_id)
          logger.error('ScanOut', `Failure #${index + 1}`, {
            batchId: failedItem.batch_id,
            errorMessage: failedItem.error_message,
            requestedQuantity: originalItem?.quantityRemoved,
            actionType: originalItem?.actionType,
            reason: originalItem?.reason,
            notes: originalItem?.notes,
          })
        })
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
      logger.error('ScanOut', 'Checkout failed', { error })
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
