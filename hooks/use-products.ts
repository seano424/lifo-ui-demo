// hooks/use-products.ts - Updated with sorting support

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries/query-keys'
import {
  fetchProductsPage,
  fetchProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductFilters,
  type Product,
  type ProductSort,
  type SortField,
  type SortDirection,
} from '@/lib/queries/products'
import type { Database } from '@/types/supabase'
import { useCallback, useState } from 'react'

// ✅ READING DATA - Infinite scroll products list with sorting
export function useProducts(filters: ProductFilters = {}, pageSize: number = 20) {
  const result = useInfiniteQuery({
    queryKey: queryKeys.products.infinite(filters),
    queryFn: ({ pageParam = 0 }) => fetchProductsPage({ page: pageParam, pageSize }, filters),
    getNextPageParam: lastPage => lastPage.nextPage,
    initialPageParam: 0,
  })

  // Flatten pages into single array (just like Supabase UI hook)
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

// ✅ NEW: Products hook with built-in sorting state management
export function useProductsWithSort(initialSort?: ProductSort, pageSize: number = 20) {
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

  // Helper function to get sort direction for a field
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

// ✅ READING DATA - Single product by ID
export function useProduct(productId: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: () => fetchProductById(productId),
    enabled: !!productId, // Only fetch if productId exists
  })
}

// ✅ CONVENIENCE HOOKS - Common filter patterns with sorting support
export function useExpiringProducts(storeId: string, sort?: ProductSort) {
  return useProducts({
    sort,
    /* add expiring filter when you have it */
  })
}

export function useStoreProducts(storeId: string, sort?: ProductSort) {
  return useProducts({
    sort,
    /* add store filter when you have it */
  })
}

// ✅ WRITING DATA - Product CRUD actions with proper cache invalidation
export function useProductActions() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (productData: Database['inventory']['Tables']['products']['Insert']) =>
      createProduct(productData),
    onSuccess: newProduct => {
      // Invalidate all product lists to show the new product
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })

      // Add the new product to the detail cache
      queryClient.setQueryData(queryKeys.products.detail(newProduct.product_id), newProduct)

      toast.success('Product created successfully')
    },
    onError: error => {
      console.error('Failed to create product:', error)
      toast.error('Failed to create product')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      productId,
      updates,
    }: {
      productId: string
      updates: Database['inventory']['Tables']['products']['Update']
    }) => updateProduct(productId, updates),

    onMutate: async ({ productId, updates }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeys.products.detail(productId) })

      // Snapshot the previous value
      const previousProduct = queryClient.getQueryData(queryKeys.products.detail(productId))

      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.products.detail(productId), (old: Product | undefined) =>
        old ? { ...old, ...updates, updated_at: new Date().toISOString() } : undefined,
      )

      // Also update in infinite query caches
      queryClient.setQueriesData({ queryKey: queryKeys.products.lists() }, (oldData: any) => {
        if (!oldData) return oldData

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: page.data.map((product: Product) =>
              product.product_id === productId
                ? { ...product, ...updates, updated_at: new Date().toISOString() }
                : product,
            ),
          })),
        }
      })

      // Return a context object with the snapshotted value
      return { previousProduct, productId }
    },

    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousProduct) {
        queryClient.setQueryData(
          queryKeys.products.detail(context.productId),
          context.previousProduct,
        )
      }
      console.error('Failed to update product:', err)
      toast.error('Failed to update product')
    },

    onSettled: (data, error, { productId }) => {
      // Always refetch after error or success to ensure we have correct data
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })
    },

    onSuccess: () => {
      toast.success('Product updated successfully')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),

    onMutate: async productId => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.products.detail(productId) })

      // Snapshot the previous value
      const previousProduct = queryClient.getQueryData(queryKeys.products.detail(productId))

      // Optimistically remove from detail cache
      queryClient.removeQueries({ queryKey: queryKeys.products.detail(productId) })

      // Optimistically remove from infinite query caches
      queryClient.setQueriesData({ queryKey: queryKeys.products.lists() }, (oldData: any) => {
        if (!oldData) return oldData

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: page.data.filter((product: Product) => product.product_id !== productId),
            count: Math.max(0, page.count - 1),
          })),
        }
      })

      return { previousProduct, productId }
    },

    onError: (err, productId, context) => {
      // Restore the product if deletion failed
      if (context?.previousProduct) {
        queryClient.setQueryData(
          queryKeys.products.detail(context.productId),
          context.previousProduct,
        )
      }
      console.error('Failed to delete product:', err)
      toast.error('Failed to delete product')
    },

    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })
    },

    onSuccess: () => {
      toast.success('Product deleted successfully')
    },
  })

  // ✅ CONVENIENCE METHODS - Business logic helpers
  const updateProductPrice = useCallback(
    (productId: string, newPrice: number) =>
      updateMutation.mutate({
        productId,
        updates: { base_selling_price: newPrice },
      }),
    [updateMutation],
  )

  const updateProductStock = useCallback(
    (productId: string, newStock: number) =>
      updateMutation.mutate({
        productId,
        updates: { total_stock: newStock },
      }),
    [updateMutation],
  )

  const updateProductCategory = useCallback(
    (productId: string, category: string) =>
      updateMutation.mutate({
        productId,
        updates: { category },
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
    updateProductStock,
    updateProductCategory,

    // Access to mutation objects for advanced usage
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
