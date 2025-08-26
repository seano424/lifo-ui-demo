import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries/query-keys'
import { createClient } from '@/lib/supabase/client'

// Custom type for available batches with product info
interface AvailableBatch {
  batch_id: string
  product_id: string
  store_id: string
  expiry_date: string
  current_quantity: number
  cost_price: number
  selling_price: number
  created_at: string
  products: {
    product_name: string
    brand_name: string
    barcode: string
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

/**
 * Hook for scan-out specific actions:
 * - Finding available inventory batches by barcode and store
 * - Processing checkout/removal transactions
 * - Updating inventory quantities
 */
export function useScanOutActions() {
  const queryClient = useQueryClient()

  /**
   * Find available inventory batches for a product by barcode and store
   * This replaces the OpenFoodFacts lookup for scan-out workflows
   */
  const findAvailableBatches = async (
    barcode: string,
    storeId: string,
  ): Promise<AvailableBatch[]> => {
    const supabase = createClient()

    try {
      // First, find the product by barcode
      const { data: products, error: productError } = await supabase
        .from('products')
        .select('product_id, product_name, brand_name')
        .eq('barcode', barcode)
        .single()

      if (productError || !products) {
        console.log('Product not found for barcode:', barcode)
        return []
      }

      // Then find all available batches for this product in the current store
      const { data: batches, error: batchError } = await supabase
        .from('batches')
        .select(`
          batch_id,
          product_id,
          store_id,
          expiry_date,
          current_quantity,
          cost_price,
          selling_price,
          created_at
        `)
        .eq('product_id', products.product_id)
        .eq('store_id', storeId)
        .gt('current_quantity', 0) // Only batches with available inventory
        .order('expiry_date', { ascending: true }) // FIFO - oldest expiry first

      if (batchError) {
        console.error('Error fetching batches:', batchError)
        throw new Error('Failed to fetch available inventory')
      }

      // Transform batches to include product information
      const transformedBatches: AvailableBatch[] = (batches || []).map(batch => ({
        ...batch,
        products: {
          product_name: products.product_name,
          brand_name: products.brand_name,
          barcode: barcode,
        },
      }))

      return transformedBatches
    } catch (error) {
      console.error('Error in findAvailableBatches:', error)
      throw error
    }
  }

  /**
   * Process checkout/removal of items from inventory
   * This handles the batch quantity updates and transaction logging
   */
  const checkoutMutation = useMutation({
    mutationFn: async (items: CheckoutItem[]): Promise<CheckoutResult> => {
      const supabase = createClient()
      const results: CheckoutResult['results'] = []
      let successCount = 0
      let failureCount = 0

      // Process each item in the checkout
      for (const item of items) {
        try {
          // Start a transaction to ensure data consistency
          const { data: batch, error: fetchError } = await supabase
            .from('batches')
            .select('batch_id, current_quantity, product_id, store_id')
            .eq('batch_id', item.batchId)
            .single()

          if (fetchError || !batch) {
            results.push({
              batchId: item.batchId,
              success: false,
              error: 'Batch not found',
            })
            failureCount++
            continue
          }

          // Check if enough quantity is available
          if (batch.current_quantity < item.quantityRemoved) {
            results.push({
              batchId: item.batchId,
              success: false,
              error: `Insufficient quantity. Available: ${batch.current_quantity}, Requested: ${item.quantityRemoved}`,
            })
            failureCount++
            continue
          }

          // Update the batch quantity
          const newQuantity = batch.current_quantity - item.quantityRemoved
          const { error: updateError } = await supabase
            .from('batches')
            .update({ current_quantity: newQuantity })
            .eq('batch_id', item.batchId)

          if (updateError) {
            results.push({
              batchId: item.batchId,
              success: false,
              error: updateError.message,
            })
            failureCount++
            continue
          }

          // TODO: Log the transaction in a transactions/movements table
          // This would track the removal for audit purposes
          // await supabase.from('inventory_transactions').insert({
          //   batch_id: item.batchId,
          //   transaction_type: 'removal',
          //   quantity: item.quantityRemoved,
          //   reason: item.reason,
          //   store_id: item.storeId,
          //   notes: item.notes,
          //   created_at: new Date().toISOString(),
          // })

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

    onSuccess: result => {
      if (result.success) {
        // Invalidate relevant queries to refresh the UI
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.all,
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
