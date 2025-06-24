// hooks/use-batches.ts - Complete implementation

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries/query-keys'
import {
  fetchBatchesPage,
  fetchBatchById,
  fetchBatchesForProduct,
  fetchExpiringBatches,
  fetchLowStockBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  type BatchFilters,
  type Batch,
  type BatchWithProduct,
} from '@/lib/queries/batches'
import type { Database } from '@/types/supabase'

// ✅ READING DATA - Infinite scroll batches list
export function useBatches(filters: BatchFilters = {}, pageSize: number = 20) {
  const result = useInfiniteQuery({
    queryKey: queryKeys.batches.infinite(filters),
    queryFn: ({ pageParam = 0 }) => fetchBatchesPage({ page: pageParam, pageSize }, filters),
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0,
  })

  // Flatten pages into single array (just like your products pattern)
  const data = result.data?.pages.flatMap(page => page.data) ?? []

  return {
    data,
    count: result.data?.pages[0]?.count ?? 0,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error,
    hasMore: result.hasNextPage,
    fetchNextPage: result.fetchNextPage,
    isFetchingNextPage: result.isFetchingNextPage,
  }
}

// ✅ READING DATA - Single batch by ID
export function useBatch(batchId: string) {
  return useQuery({
    queryKey: queryKeys.batches.detail(batchId),
    queryFn: () => fetchBatchById(batchId),
    enabled: !!batchId, // Only fetch if batchId exists
  })
}

// ✅ READING DATA - Batches for a specific product
export function useBatchesForProduct(
  productId: string,
  filters: Omit<BatchFilters, 'product_id'> = {},
  pageSize: number = 20,
) {
  const result = useInfiniteQuery({
    queryKey: queryKeys.batches.infinite(filters),
    queryFn: ({ pageParam = 0 }) =>
      fetchBatchesForProduct(productId, { page: pageParam, pageSize }, filters),
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!productId,
  })

  const data = result.data?.pages.flatMap(page => page.data) ?? []

  return {
    data,
    count: result.data?.pages[0]?.count ?? 0,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error,
    hasMore: result.hasNextPage,
    fetchNextPage: result.fetchNextPage,
    isFetchingNextPage: result.isFetchingNextPage,
  }
}

// ✅ CONVENIENCE HOOKS - Common filter patterns
export function useExpiringBatches(daysAhead: number = 7) {
  return useQuery({
    queryKey: queryKeys.batches.infinite({ expiringInDays: daysAhead }),
    queryFn: () => fetchExpiringBatches(daysAhead),
    // Refetch more frequently for critical data
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  })
}

export function useLowStockBatches(thresholdQuantity: number = 10) {
  return useQuery({
    queryKey: [...queryKeys.batches.all, 'lowStock', { threshold: thresholdQuantity }],
    queryFn: () => fetchLowStockBatches(thresholdQuantity),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useActiveBatches() {
  return useBatches({ status: 'active', hasStock: true })
}

export function useExpiredBatches() {
  return useBatches({ status: 'expired' })
}

export function useBatchesByLocation(locationCode: string) {
  return useBatches({ location_code: locationCode, status: 'active' })
}

export function useBatchesBySupplier(supplier: string) {
  return useBatches({ supplier, status: 'active' })
}

// ✅ WRITING DATA - Batch CRUD actions with proper cache invalidation
export function useBatchActions() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (batchData: Database['inventory']['Tables']['batches']['Insert']) =>
      createBatch(batchData),
    onSuccess: newBatch => {
      // Invalidate all batch lists to show the new batch
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.lists() })

      // Invalidate product-specific batch lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.batches.byProduct(newBatch.product_id),
      })

      // Add the new batch to the detail cache
      queryClient.setQueryData(queryKeys.batches.detail(newBatch.batch_id), newBatch)

      // Update product batch count if cached
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(newBatch.product_id),
      })

      toast.success('Batch created successfully')
    },
    onError: error => {
      console.error('Failed to create batch:', error)
      toast.error('Failed to create batch')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      batchId,
      updates,
    }: {
      batchId: string
      updates: Database['inventory']['Tables']['batches']['Update']
    }) => updateBatch(batchId, updates),

    onMutate: async ({ batchId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.batches.detail(batchId) })

      // Snapshot the previous value
      const previousBatch = queryClient.getQueryData(queryKeys.batches.detail(batchId))

      // Optimistically update to the new value
      queryClient.setQueryData(
        queryKeys.batches.detail(batchId),
        (old: BatchWithProduct | undefined) =>
          old ? { ...old, ...updates, updated_at: new Date().toISOString() } : undefined,
      )

      // Also update in infinite query caches
      queryClient.setQueriesData({ queryKey: queryKeys.batches.lists() }, (oldData: any) => {
        if (!oldData) return oldData

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: page.data.map((batch: Batch) =>
              batch.batch_id === batchId
                ? { ...batch, ...updates, updated_at: new Date().toISOString() }
                : batch,
            ),
          })),
        }
      })

      return { previousBatch, batchId }
    },

    onError: (err, variables, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousBatch) {
        queryClient.setQueryData(queryKeys.batches.detail(context.batchId), context.previousBatch)
      }
      console.error('Failed to update batch:', err)
      toast.error('Failed to update batch')
    },

    onSettled: (data, error, { batchId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.detail(batchId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.lists() })

      // Invalidate related product queries
      if (data) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.byProduct(data.product_id),
        })
      }
    },

    onSuccess: () => {
      toast.success('Batch updated successfully')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (batchId: string) => deleteBatch(batchId),

    onMutate: async batchId => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.batches.detail(batchId) })

      // Snapshot the previous value
      const previousBatch = queryClient.getQueryData(queryKeys.batches.detail(batchId)) as
        | BatchWithProduct
        | undefined

      // Optimistically remove from detail cache
      queryClient.removeQueries({ queryKey: queryKeys.batches.detail(batchId) })

      // Optimistically remove from infinite query caches
      queryClient.setQueriesData({ queryKey: queryKeys.batches.lists() }, (oldData: any) => {
        if (!oldData) return oldData

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: page.data.filter((batch: Batch) => batch.batch_id !== batchId),
            count: Math.max(0, page.count - 1),
          })),
        }
      })

      return { previousBatch, batchId }
    },

    onError: (err, batchId, context) => {
      // Restore the batch if deletion failed
      if (context?.previousBatch) {
        queryClient.setQueryData(queryKeys.batches.detail(context.batchId), context.previousBatch)
      }
      console.error('Failed to delete batch:', err)
      toast.error('Failed to delete batch')
    },

    onSettled: (data, error, batchId, context) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.lists() })

      // Invalidate related product queries
      if (context?.previousBatch) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.byProduct(context.previousBatch.product_id),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.detail(context.previousBatch.product_id),
        })
      }
    },

    onSuccess: () => {
      toast.success('Batch deleted successfully')
    },
  })

  // ✅ CONVENIENCE METHODS - Business logic helpers
  const updateBatchQuantity = (batchId: string, newQuantity: number) =>
    updateMutation.mutate({
      batchId,
      updates: { current_quantity: newQuantity },
    })

  const updateBatchPrice = (batchId: string, costPrice: number, sellingPrice: number) =>
    updateMutation.mutate({
      batchId,
      updates: {
        cost_price: costPrice,
        selling_price: sellingPrice,
      },
    })

  const updateBatchLocation = (batchId: string, locationCode: string) =>
    updateMutation.mutate({
      batchId,
      updates: { location_code: locationCode },
    })

  const markBatchAsExpired = (batchId: string) =>
    updateMutation.mutate({
      batchId,
      updates: { status: 'expired' },
    })

  const markBatchAsDamaged = (batchId: string) =>
    updateMutation.mutate({
      batchId,
      updates: { status: 'damaged' },
    })

  const markBatchAsSoldOut = (batchId: string) =>
    updateMutation.mutate({
      batchId,
      updates: {
        status: 'sold_out',
        current_quantity: 0,
      },
    })

  const reserveBatchQuantity = (batchId: string, reservedQuantity: number) =>
    updateMutation.mutate({
      batchId,
      updates: { reserved_quantity: reservedQuantity },
    })

  // ✅ ADVANCED: Batch operations for multiple batches
  const processSale = (batchId: string, soldQuantity: number) => {
    const currentBatch = queryClient.getQueryData(queryKeys.batches.detail(batchId)) as
      | Batch
      | undefined

    if (!currentBatch) {
      toast.error('Batch not found')
      return
    }

    if (soldQuantity > (currentBatch.available_quantity || 0)) {
      toast.error('Not enough stock available')
      return
    }

    const newQuantity = Number(currentBatch.current_quantity) - soldQuantity
    const newStatus = newQuantity <= 0 ? 'sold_out' : 'active'

    updateMutation.mutate({
      batchId,
      updates: {
        current_quantity: newQuantity,
        status: newStatus,
      },
    })
  }

  return {
    // Raw mutation functions
    createBatch: createMutation.mutate,
    updateBatch: updateMutation.mutate,
    deleteBatch: deleteMutation.mutate,

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Convenience methods for common operations
    updateBatchQuantity,
    updateBatchPrice,
    updateBatchLocation,
    markBatchAsExpired,
    markBatchAsDamaged,
    markBatchAsSoldOut,
    reserveBatchQuantity,
    processSale,

    // Access to mutation objects for advanced usage
    createMutation,
    updateMutation,
    deleteMutation,
  }
}

// ✅ HELPER HOOKS for business scenarios
export function useBatchSummary(productId?: string) {
  const { data: allBatches } = useBatches(productId ? { product_id: productId } : {})

  return {
    totalBatches: allBatches?.length || 0,
    activeBatches: allBatches?.filter(b => b.status === 'active').length || 0,
    expiredBatches: allBatches?.filter(b => b.status === 'expired').length || 0,
    totalStock: allBatches?.reduce((sum, b) => sum + Number(b.current_quantity), 0) || 0,
    totalValue:
      allBatches?.reduce((sum, b) => sum + Number(b.current_quantity) * Number(b.cost_price), 0) ||
      0,
  }
}

export function useBatchAlerts() {
  const { data: expiringBatches, isLoading: isLoadingExpiring } = useExpiringBatches(7)
  const { data: lowStockBatches, isLoading: isLoadingLowStock } = useLowStockBatches(10)

  return {
    expiringBatches: expiringBatches || [],
    lowStockBatches: lowStockBatches || [],
    hasAlerts: (expiringBatches?.length || 0) > 0 || (lowStockBatches?.length || 0) > 0,
    isLoading: isLoadingExpiring || isLoadingLowStock,
  }
}
