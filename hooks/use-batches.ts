import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  type Batch,
  type BatchFilters,
  type BatchSort,
  type BatchSortDirection,
  type BatchSortField,
  type BatchWithProduct,
  createBatch,
  deleteBatch,
  fetchBatchById,
  fetchBatchesForProduct,
  updateBatch,
} from '@/lib/queries/batches'
import {
  fetchBatchesPageRPC,
  fetchExpiringBatchesRPC,
  fetchLowStockBatchesRPC,
} from '@/lib/queries/batches-rpc'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'
import type { Database } from '@/types/supabase'
import type { TodoFilters } from '@/lib/queries/todos-rpc'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

export function useBatches(filters: BatchFilters = {}, pageSize: number = 20) {
  const activeStoreId = useActiveStoreId()

  const result = useInfiniteQuery({
    queryKey: queryKeys.batches.infinite(activeStoreId || '', filters),
    queryFn: ({ pageParam = 0 }) =>
      fetchBatchesPageRPC(
        { page: pageParam, pageSize },
        { ...filters, storeId: activeStoreId || undefined },
        undefined,
      ),
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!activeStoreId,
    retry: (failureCount, error: SupabaseError) => {
      if (error?.message?.includes('failed to parse order')) {
        console.error('[useBatches] PostgREST ordering error - not retrying:', error)
        return false
      }
      if (error?.status && error.status >= 400 && error.status < 500 && error.status !== 408) {
        return false
      }
      return failureCount < 3
    },
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

export function useBatchesWithSort(initialSort?: BatchSort, pageSize: number = 20) {
  const [currentSort, setCurrentSort] = useState<BatchSort>(
    initialSort || { field: 'expiry_date', direction: 'asc' },
  )

  const filters: BatchFilters = {
    sort: currentSort,
  }

  const result = useBatches(filters, pageSize)

  const updateSort = useCallback((field: BatchSortField) => {
    setCurrentSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const getSortDirection = useCallback(
    (field: BatchSortField): BatchSortDirection | null => {
      return currentSort.field === field ? currentSort.direction : null
    },
    [currentSort],
  )

  return {
    ...result,
    currentSort,
    updateSort,
    getSortDirection,
    setSort: setCurrentSort,
  }
}

export function useBatch(batchId: string) {
  return useQuery({
    queryKey: queryKeys.batches.detail(batchId),
    queryFn: () => fetchBatchById(batchId),
    enabled: !!batchId,
    retry: (failureCount, error: SupabaseError) => {
      if (error?.message?.includes('failed to parse order')) {
        return false
      }
      if (error?.status && error.status >= 400 && error.status < 500 && error.status !== 408) {
        return false
      }
      return failureCount < 3
    },
  })
}

export function useBatchesForProduct(
  productId: string,
  filters: Omit<BatchFilters, 'product_id'> = {},
  pageSize: number = 20,
) {
  const activeStoreId = useActiveStoreId()

  const result = useInfiniteQuery({
    queryKey: queryKeys.batches.byProduct(activeStoreId || '', productId),
    queryFn: ({ pageParam = 0 }) =>
      fetchBatchesForProduct(
        productId,
        { page: pageParam, pageSize },
        { ...filters, storeId: activeStoreId || undefined },
      ),
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!productId && !!activeStoreId,
    retry: (failureCount, error: SupabaseError) => {
      if (error?.message?.includes('failed to parse order')) {
        return false
      }
      if (error?.status && error.status >= 400 && error.status < 500 && error.status !== 408) {
        return false
      }
      return failureCount < 3
    },
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

export function useExpiringBatches(daysAhead: number = 7) {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: [...queryKeys.batches.byStore(activeStoreId || ''), 'expiring', { daysAhead }],
    queryFn: () => fetchExpiringBatchesRPC(activeStoreId!, daysAhead),
    enabled: !!activeStoreId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    retry: (failureCount, error: SupabaseError) => {
      if (error?.message?.includes('failed to parse order')) {
        return false
      }
      if (error?.status && error.status >= 400 && error.status < 500 && error.status !== 408) {
        return false
      }
      return failureCount < 3
    },
  })
}

export function useLowStockBatches(thresholdQuantity: number = 10) {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: [
      ...queryKeys.batches.byStore(activeStoreId || ''),
      'lowStock',
      { threshold: thresholdQuantity },
    ],
    queryFn: () => fetchLowStockBatchesRPC(activeStoreId!, thresholdQuantity),
    enabled: !!activeStoreId,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: SupabaseError) => {
      if (error?.message?.includes('failed to parse order')) {
        return false
      }
      if (error?.status && error.status >= 400 && error.status < 500 && error.status !== 408) {
        return false
      }
      return failureCount < 3
    },
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

export function useBatchActions() {
  const queryClient = useQueryClient()
  const activeStoreId = useActiveStoreId()

  const createMutation = useMutation({
    mutationFn: (batchData: Database['inventory']['Tables']['batches']['Insert']) => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }

      const batchWithStore = {
        ...batchData,
        store_id: activeStoreId,
      }
      return createBatch(batchWithStore)
    },
    onSuccess: newBatch => {
      if (activeStoreId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.byStore(activeStoreId),
        })
      }

      queryClient.invalidateQueries({
        queryKey: queryKeys.batches.byProduct(activeStoreId || '', newBatch.product_id),
      })

      queryClient.setQueryData(queryKeys.batches.detail(newBatch.batch_id), newBatch)

      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(newBatch.product_id),
      })

      toast.success('Batch created successfully')
    },
    onError: (error: SupabaseError) => {
      console.error('Failed to create batch:', error)

      if (error?.message?.includes('not available in this store')) {
        toast.error('Product is not available in the current store')
      } else if (error?.message?.includes('already exists')) {
        toast.error('Batch number already exists')
      } else {
        toast.error('Failed to create batch')
      }
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
      await queryClient.cancelQueries({
        queryKey: queryKeys.batches.detail(batchId),
      })

      const previousBatch = queryClient.getQueryData(queryKeys.batches.detail(batchId))

      queryClient.setQueryData(
        queryKeys.batches.detail(batchId),
        (old: BatchWithProduct | undefined) =>
          old ? { ...old, ...updates, updated_at: new Date().toISOString() } : undefined,
      )

      if (activeStoreId) {
        queryClient.setQueriesData(
          { queryKey: queryKeys.batches.byStore(activeStoreId) },
          (oldData: unknown) => {
            if (!isInfiniteData(oldData)) return oldData

            return {
              ...oldData,
              pages: oldData.pages.map(page => {
                if (!page || !page.data || !Array.isArray(page.data)) return page

                return {
                  ...page,
                  data: page.data.map((batch: Batch) =>
                    batch.batch_id === batchId
                      ? {
                          ...batch,
                          ...updates,
                          updated_at: new Date().toISOString(),
                        }
                      : batch,
                  ),
                }
              }),
            }
          },
        )
      }

      return { previousBatch, batchId }
    },

    onError: (err, _variables, context) => {
      if (context?.previousBatch) {
        queryClient.setQueryData(queryKeys.batches.detail(context.batchId), context.previousBatch)
      }
      console.error('Failed to update batch:', err)
      toast.error('Failed to update batch')
    },

    onSettled: (data, _error, { batchId }) => {
      // Invalidate batch-related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.batches.detail(batchId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.batches.todo(batchId),
      })
      if (activeStoreId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.byStore(activeStoreId),
        })

        // Invalidate todo-related queries that depend on batch data
        queryClient.invalidateQueries({
          predicate: query => {
            const queryKey = query.queryKey as readonly unknown[]
            // Match the exact structure: ["todos", "filtered", { storeId, filters, pageSize }]
            if (queryKey[0] === 'todos' && queryKey[1] === 'filtered') {
              const params = queryKey?.[2] as
                | { storeId?: string; filters?: TodoFilters; pageSize?: number }
                | undefined
              return params?.storeId === activeStoreId
            }
            return false
          },
        })

        // Also force refetch to ensure immediate data updates
        queryClient.refetchQueries({
          predicate: query => {
            const queryKey = query.queryKey as readonly unknown[]
            // Match the exact structure: ["todos", "filtered", { storeId, filters, pageSize }]
            if (queryKey[0] === 'todos' && queryKey[1] === 'filtered') {
              const params = queryKey?.[2] as
                | { storeId?: string; filters?: TodoFilters; pageSize?: number }
                | undefined
              return params?.storeId === activeStoreId
            }
            return false
          },
        })

        // Invalidate dashboard summaries since batch updates affect metrics
        queryClient.invalidateQueries({
          queryKey: queryKeys.todos.dashboardSummary(activeStoreId),
        })
      }

      if (data) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.byProduct(activeStoreId || '', data.product_id),
        })
      }
    },

    onSuccess: (_data, { batchId }) => {
      // Immediately invalidate the batch todo query after successful update
      queryClient.invalidateQueries({
        queryKey: queryKeys.batches.todo(batchId),
      })
      // Also force refetch
      queryClient.refetchQueries({
        queryKey: queryKeys.batches.todo(batchId),
      })
      toast.success('Batch updated successfully')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (batchId: string) => deleteBatch(batchId),

    onMutate: async batchId => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.batches.detail(batchId),
      })

      const previousBatch = queryClient.getQueryData(queryKeys.batches.detail(batchId)) as
        | BatchWithProduct
        | undefined

      queryClient.removeQueries({ queryKey: queryKeys.batches.detail(batchId) })

      if (activeStoreId) {
        queryClient.setQueriesData(
          { queryKey: queryKeys.batches.byStore(activeStoreId) },
          (oldData: unknown) => {
            if (!isInfiniteData(oldData)) return oldData

            return {
              ...oldData,
              pages: oldData.pages.map(page => {
                if (!page || !page.data || !Array.isArray(page.data)) return page

                return {
                  ...page,
                  data: page.data.filter((batch: Batch) => batch.batch_id !== batchId),
                  count: Math.max(0, (page.count || 0) - 1),
                }
              }),
            }
          },
        )
      }

      return { previousBatch, batchId }
    },

    onError: (err, _batchId, context) => {
      if (context?.previousBatch) {
        queryClient.setQueryData(queryKeys.batches.detail(context.batchId), context.previousBatch)
      }
      console.error('Failed to delete batch:', err)
      toast.error('Failed to delete batch')
    },

    onSettled: (_data, _error, _batchId, context) => {
      if (activeStoreId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.byStore(activeStoreId),
        })
      }

      if (context?.previousBatch) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.batches.byProduct(
            activeStoreId || '',
            context.previousBatch.product_id,
          ),
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

  const updateBatchQuantity = useCallback(
    (batchId: string, newQuantity: number) =>
      updateMutation.mutate({
        batchId,
        updates: { current_quantity: newQuantity },
      }),
    [updateMutation],
  )

  const updateBatchPrice = useCallback(
    (batchId: string, costPrice: number, sellingPrice: number) =>
      updateMutation.mutate({
        batchId,
        updates: {
          cost_price: costPrice,
          selling_price: sellingPrice,
        },
      }),
    [updateMutation],
  )

  const updateBatchLocation = useCallback(
    (batchId: string, locationCode: string) =>
      updateMutation.mutate({
        batchId,
        updates: { location_code: locationCode },
      }),
    [updateMutation],
  )

  const markBatchAsExpired = useCallback(
    (batchId: string) =>
      updateMutation.mutate({
        batchId,
        updates: { status: 'expired' },
      }),
    [updateMutation],
  )

  const markBatchAsDamaged = useCallback(
    (batchId: string) =>
      updateMutation.mutate({
        batchId,
        updates: { status: 'damaged' },
      }),
    [updateMutation],
  )

  const markBatchAsSoldOut = useCallback(
    (batchId: string) =>
      updateMutation.mutate({
        batchId,
        updates: {
          status: 'sold_out',
          current_quantity: 0,
        },
      }),
    [updateMutation],
  )

  const reserveBatchQuantity = useCallback(
    (batchId: string, reservedQuantity: number) =>
      updateMutation.mutate({
        batchId,
        updates: { reserved_quantity: reservedQuantity },
      }),
    [updateMutation],
  )

  const processSale = useCallback(
    (batchId: string, soldQuantity: number) => {
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
    },
    [updateMutation, queryClient],
  )

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

export function useBatchSummary(productId?: string) {
  const filters = productId ? { product_id: productId } : {}
  const { data: allBatches } = useBatches(filters)

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

export function useBatchesByCategory(_category: string) {
  // Note: Category filtering would need to be done via product join
  // For now, this returns all batches (would need backend enhancement)
  return useBatches({
    /* filter by product category if needed */
  })
}

export function useBatchesByStatus(
  status: 'active' | 'expired' | 'damaged' | 'sold_out' | 'reserved',
) {
  return useBatches({ status })
}

type SupabaseError = Error & {
  status?: number
  code?: string
}

function isInfiniteData(
  data: unknown,
): data is InfiniteData<{ data: Batch[]; nextPage?: number; count?: number }, number> {
  return (
    data !== null &&
    typeof data === 'object' &&
    'pages' in data &&
    Array.isArray((data as Record<string, unknown>).pages)
  )
}
