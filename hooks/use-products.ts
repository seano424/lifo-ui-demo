// hooks/use-products.ts

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  type CreateProductData,
  createProduct,
  deleteProduct,
  fetchProductById,
  fetchProductWithBatches,
  type Product,
  type ProductFilters,
  type ProductSort,
  type SortDirection,
  type SortField,
  type UpdateProductData,
  updateProduct,
} from '@/lib/queries/products'
import { fetchProductsPageRPC } from '@/lib/queries/products-rpc'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'

export function useProducts(filters: ProductFilters = {}, pageSize: number = 100) {
  const activeStoreId = useActiveStoreId()

  // Don't fetch if no active store
  const result = useInfiniteQuery({
    queryKey: queryKeys.products.infinite(activeStoreId || '', filters),
    queryFn: ({ pageParam = 0 }) => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchProductsPageRPC(
        { page: pageParam, pageSize },
        { ...filters, storeId: activeStoreId },
        undefined,
      )
    },
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!activeStoreId, // Only fetch when we have a store
    retry: (failureCount, error: Error) => {
      // Don't retry on PostgREST ordering errors (shouldn't happen with RPC but keep for safety)
      if (error?.message?.includes('failed to parse order')) {
        console.error('[useProducts] PostgREST ordering error - not retrying:', error)
        return false
      }
      return failureCount < 3
    },
  })

  // Flatten pages into single array (just like before)
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

export function useProductsWithSort(initialSort?: ProductSort, pageSize: number = 100) {
  const [currentSort, setCurrentSort] = useState<ProductSort>(
    initialSort || { field: 'created_at', direction: 'desc' },
  )

  const filters: ProductFilters = {
    sort: currentSort,
  }

  const result = useProducts(filters, pageSize)

  // Helper function to update sort
  const updateSort = useCallback((field: SortField) => {
    setCurrentSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const getSortDirection = useCallback(
    (field: SortField): SortDirection | null => {
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

export function useProduct(productId: string) {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchProductById(productId, activeStoreId)
    },
    enabled: !!productId && !!activeStoreId,
  })
}

export function useProductWithBatches(productId: string) {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.products.detailWithBatches(productId, activeStoreId || ''),
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchProductWithBatches(productId, activeStoreId)
    },
    enabled: !!productId && !!activeStoreId,
    // Match prefetch staleTime so the prefetched data isn't immediately refetched on modal open
    staleTime: 30_000,
  })
}

export function useProductActions() {
  const queryClient = useQueryClient()
  const activeStoreId = useActiveStoreId()

  const createMutation = useMutation({
    mutationFn: (productData: CreateProductData) => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      // Automatically add storeId to product data
      const productWithStore = {
        ...productData,
        storeId: activeStoreId,
      }
      return createProduct(productWithStore)
    },
    onSuccess: newProduct => {
      // Invalidate store-specific product lists
      if (activeStoreId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.byStore(activeStoreId),
        })
      }

      // Add the new product to the detail cache
      queryClient.setQueryData(queryKeys.products.detail(newProduct.product_id), newProduct)

      toast.success('Product created successfully')
    },
    onError: error => {
      console.error('Failed to create product:', error)
      toast.error(`Failed to create product: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ productId, updates }: { productId: string; updates: UpdateProductData }) => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return updateProduct(productId, updates, activeStoreId)
    },

    onMutate: async ({ productId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.products.detail(productId),
      })

      // Snapshot previous value
      const previousProduct = queryClient.getQueryData(queryKeys.products.detail(productId))

      // Optimistically update
      queryClient.setQueryData(queryKeys.products.detail(productId), (old: Product | undefined) =>
        old ? { ...old, ...updates, updated_at: new Date().toISOString() } : undefined,
      )

      // Also update in store-specific infinite query caches
      if (activeStoreId) {
        queryClient.setQueriesData(
          { queryKey: queryKeys.products.byStore(activeStoreId) },
          (oldData: { pages: { data: Product[]; count: number }[] } | undefined) => {
            if (!oldData) return oldData

            return {
              ...oldData,
              pages: oldData.pages.map((page: { data: Product[]; count: number }) => ({
                ...page,
                data: page.data.map((product: Product) =>
                  product.product_id === productId
                    ? {
                        ...product,
                        ...updates,
                        updated_at: new Date().toISOString(),
                      }
                    : product,
                ),
              })),
            }
          },
        )
      }

      return { previousProduct, productId }
    },

    onError: (err, _variables, context) => {
      // Revert on error
      if (context?.previousProduct) {
        queryClient.setQueryData(
          queryKeys.products.detail(context.productId),
          context.previousProduct,
        )
      }
      console.error('Failed to update product:', err)
      toast.error(`Failed to update product: ${err.message}`)
    },

    onSettled: (_data, _error, { productId }) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(productId),
      })
      if (activeStoreId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.byStore(activeStoreId),
        })
      }
    },

    onSuccess: () => {
      toast.success('Product updated successfully')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return deleteProduct(productId, activeStoreId)
    },

    onMutate: async productId => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.products.detail(productId),
      })

      // Snapshot previous value
      const previousProduct = queryClient.getQueryData(queryKeys.products.detail(productId))

      // Optimistically remove from detail cache
      queryClient.removeQueries({
        queryKey: queryKeys.products.detail(productId),
      })

      // Optimistically remove from store-specific infinite query caches
      if (activeStoreId) {
        queryClient.setQueriesData(
          { queryKey: queryKeys.products.byStore(activeStoreId) },
          (oldData: { pages: { data: Product[]; count: number }[] } | undefined) => {
            if (!oldData) return oldData

            return {
              ...oldData,
              pages: oldData.pages.map((page: { data: Product[]; count: number }) => ({
                ...page,
                data: page.data.filter((product: Product) => product.product_id !== productId),
                count: Math.max(0, page.count - 1),
              })),
            }
          },
        )
      }

      return { previousProduct, productId }
    },

    onError: (err, _productId, context) => {
      // Restore the product if deletion failed
      if (context?.previousProduct) {
        queryClient.setQueryData(
          queryKeys.products.detail(context.productId),
          context.previousProduct,
        )
      }
      console.error('Failed to delete product:', err)
      toast.error(`Failed to delete product: ${err.message}`)
    },

    onSettled: () => {
      // Refetch to ensure consistency
      if (activeStoreId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.byStore(activeStoreId),
        })
      }
    },

    onSuccess: () => {
      toast.success('Product deleted successfully')
    },
  })

  const updateProductPrice = useCallback(
    (productId: string, newPrice: number) =>
      updateMutation.mutate({
        productId,
        updates: { selling_price: newPrice }, // Store-specific price
      }),
    [updateMutation],
  )

  const updateProductBasePrice = useCallback(
    (productId: string, newPrice: number) =>
      updateMutation.mutate({
        productId,
        updates: { base_selling_price: newPrice }, // Global base price
      }),
    [updateMutation],
  )

  const updateProductCategory = useCallback(
    (productId: string, category_id: string) =>
      updateMutation.mutate({
        productId,
        updates: { category_id }, // Global category_id
      }),
    [updateMutation],
  )

  const toggleProductActive = useCallback(
    (productId: string, isActive: boolean) =>
      updateMutation.mutate({
        productId,
        updates: { is_active: isActive }, // Store-specific active status
      }),
    [updateMutation],
  )

  return {
    // Raw mutation functions
    createProduct: createMutation.mutate,
    updateProduct: updateMutation.mutate,
    deleteProduct: deleteMutation.mutate,

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Convenience methods
    updateProductPrice,
    updateProductBasePrice,
    updateProductCategory,
    toggleProductActive,

    // Access to mutation objects for advanced usage
    createMutation,
    updateMutation,
    deleteMutation,
  }
}

export function useExpiringProducts() {
  return useProducts({ expiringOnly: true })
}

export function useProductsByCategory(category: string) {
  return useProducts({ category })
}
