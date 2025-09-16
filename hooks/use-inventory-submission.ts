/**
 * React Query hook for inventory submission workflow
 * Follows established patterns for React Query integration with proper cache invalidation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  type InventorySubmissionResult,
  type ScannedProductData,
  submitMultipleScannedProducts,
  submitScannedProductToInventory,
} from '@/lib/queries/inventory'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'

/**
 * Helper function to trigger background scoring
 */
async function triggerBackgroundScoring(storeId: string, triggeredBy: string) {
  try {
    const response = await fetch('/api/scoring/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storeId,
        triggeredBy,
      }),
    })

    if (!response.ok) {
      console.warn('[triggerBackgroundScoring] Failed to trigger scoring:', response.status)
    } else {
      console.log('[triggerBackgroundScoring] Successfully triggered scoring for store:', storeId)
    }
  } catch (error) {
    console.warn('[triggerBackgroundScoring] Error triggering scoring:', error)
    // Don't throw - scoring failure shouldn't break the user flow
  }
}

/**
 * Hook for submitting a single scanned product to inventory
 * Handles complete workflow: Product → Store Product → Batch creation
 * Follows established cache invalidation patterns for products and batches
 */
export function useInventorySubmission() {
  const queryClient = useQueryClient()
  const activeStoreId = useActiveStoreId()

  const submitMutation = useMutation({
    mutationFn: (productData: ScannedProductData) => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      // Automatically add storeId to product data
      const productWithStore = {
        ...productData,
        storeId: activeStoreId,
      }
      return submitScannedProductToInventory(productWithStore)
    },

    onSuccess: (result: InventorySubmissionResult) => {
      if (result.success && activeStoreId) {
        // Invalidate product queries - both store-specific and global
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.byStore(activeStoreId),
        })

        // Invalidate batch queries - store-specific and product-specific
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.byStore(activeStoreId),
        })

        // Invalidate product-specific batch queries
        if (result.productId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.batches.byProduct(activeStoreId, result.productId),
          })

          // Update product detail cache if it exists
          queryClient.invalidateQueries({
            queryKey: queryKeys.products.detail(result.productId),
          })
        }

        // Invalidate convenience queries that might be affected
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.batches.byStore(activeStoreId), 'expiring'],
        })
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.batches.byStore(activeStoreId), 'lowStock'],
        })

        toast.success(result.message)
      } else if (!result.success) {
        toast.error(result.message)
      }
    },

    onError: (error: Error) => {
      console.error('[useInventorySubmission] Submission failed:', error)
      toast.error(`Failed to submit product: ${error.message}`)
    },
  })

  return {
    submitProduct: submitMutation.mutate,
    submitProductAsync: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    submissionResult: submitMutation.data,
    submissionError: submitMutation.error,
    // Expose the full mutation for advanced usage
    submitMutation,
  }
}

/**
 * Hook for submitting multiple scanned products as a batch
 * Handles batch processing with comprehensive cache invalidation
 */
export function useBatchInventorySubmission() {
  const queryClient = useQueryClient()
  const activeStoreId = useActiveStoreId()

  const batchSubmitMutation = useMutation({
    mutationFn: (products: ScannedProductData[]) => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      // Automatically add storeId to all product data
      const productsWithStore = products.map(product => ({
        ...product,
        storeId: activeStoreId,
      }))
      return submitMultipleScannedProducts(productsWithStore)
    },

    onMutate: async products => {
      // Show optimistic loading state
      toast.loading(`Submitting ${products.length} products to inventory...`, {
        id: 'batch-submission',
      })
    },

    onSuccess: result => {
      // Dismiss loading toast
      toast.dismiss('batch-submission')

      if (result.success && activeStoreId) {
        // Comprehensive cache invalidation for batch operations

        // Invalidate all store-specific product and batch queries
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.byStore(activeStoreId),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.byStore(activeStoreId),
        })

        // Invalidate product-specific batch queries for all affected products
        const uniqueProductIds = new Set(
          result.results.filter(r => r.success && r.productId).map(r => r.productId),
        )

        uniqueProductIds.forEach(productId => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.batches.byProduct(activeStoreId, productId),
          })
          queryClient.invalidateQueries({
            queryKey: queryKeys.products.detail(productId),
          })
        })

        // Invalidate convenience queries
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.batches.byStore(activeStoreId), 'expiring'],
        })
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.batches.byStore(activeStoreId), 'lowStock'],
        })

        // Trigger background scoring after successful batch submission
        triggerBackgroundScoring(activeStoreId, 'batch-submission')

        // Show appropriate success/failure messages
        if (result.failureCount === 0) {
          toast.success(`Successfully submitted all ${result.successCount} products to inventory`)
        } else if (result.successCount > 0) {
          toast.warning(
            `Submitted ${result.successCount} products successfully, ${result.failureCount} failed`,
          )
        } else {
          toast.error('All product submissions failed')
        }
      } else if (!result.success) {
        toast.error('Batch submission failed')
      }
    },

    onError: (error: Error) => {
      // Dismiss loading toast
      toast.dismiss('batch-submission')

      console.error('[useBatchInventorySubmission] Batch submission failed:', error)
      toast.error(`Failed to submit products: ${error.message}`)
    },
  })

  return {
    submitBatch: batchSubmitMutation.mutate,
    submitBatchAsync: batchSubmitMutation.mutateAsync,
    isSubmittingBatch: batchSubmitMutation.isPending,
    batchResult: batchSubmitMutation.data,
    batchError: batchSubmitMutation.error,
    // Expose the full mutation for advanced usage
    batchSubmitMutation,
  }
}

/**
 * Combined hook that provides both single and batch submission capabilities
 * This is the main hook that should be used in components
 */
export function useInventoryActions() {
  const singleSubmission = useInventorySubmission()
  const batchSubmission = useBatchInventorySubmission()

  return {
    // Single product submission
    submitProduct: singleSubmission.submitProduct,
    submitProductAsync: singleSubmission.submitProductAsync,
    isSubmitting: singleSubmission.isSubmitting,
    submissionResult: singleSubmission.submissionResult,
    submissionError: singleSubmission.submissionError,

    // Batch submission
    submitBatch: batchSubmission.submitBatch,
    submitBatchAsync: batchSubmission.submitBatchAsync,
    isSubmittingBatch: batchSubmission.isSubmittingBatch,
    batchResult: batchSubmission.batchResult,
    batchError: batchSubmission.batchError,

    // Combined loading state
    isLoading: singleSubmission.isSubmitting || batchSubmission.isSubmittingBatch,

    // Access to individual mutations for advanced usage
    singleSubmissionMutation: singleSubmission.submitMutation,
    batchSubmissionMutation: batchSubmission.batchSubmitMutation,
  }
}

/**
 * Helper hook to convert scanned items from the streamlined interface
 * to ScannedProductData format for submission
 */
export function useScannedItemConverter() {
  return {
    convertScannedItem: (
      scannedItem: {
        barcode: string
        productName: string
        brand?: string
        expiryDate: string
        quantity: number
        price: number
      },
      lookupResult?: {
        product?: {
          category?: string
          data?: unknown
        }
      },
    ): Omit<ScannedProductData, 'storeId'> => ({
      barcode: scannedItem.barcode,
      productName: scannedItem.productName,
      brand: scannedItem.brand,
      category: lookupResult?.product?.category || 'other',
      openFoodFactsData: lookupResult?.product?.data,
      costPrice: scannedItem.price,
      sellingPrice: scannedItem.price * 1.3, // 30% markup
      expiryDate: scannedItem.expiryDate,
      quantity: scannedItem.quantity,
    }),

    convertMultipleScannedItems: (
      scannedItems: Array<{
        barcode: string
        productName: string
        brand?: string
        expiryDate: string
        quantity: number
        price: number
      }>,
      lookupResults?: Map<string, { product?: { category?: string; data?: unknown } }>,
    ): Array<Omit<ScannedProductData, 'storeId'>> => {
      return scannedItems.map(item => ({
        barcode: item.barcode,
        productName: item.productName,
        brand: item.brand,
        category: lookupResults?.get(item.barcode)?.product?.category || 'other',
        openFoodFactsData: lookupResults?.get(item.barcode)?.product?.data,
        costPrice: item.price,
        sellingPrice: item.price * 1.3, // 30% markup
        expiryDate: item.expiryDate,
        quantity: item.quantity,
      }))
    },
  }
}
