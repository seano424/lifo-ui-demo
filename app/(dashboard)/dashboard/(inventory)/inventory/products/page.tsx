import { redirect } from 'next/navigation'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { createClient as createServerClient } from '@/lib/supabase/server'

import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchProductsPage, type ProductFilters, type SortField } from '@/lib/queries/products'
import { fetchUserStores, fetchUserPreferences } from '@/lib/queries/stores'

import ProductsHeader from '@/components/products/products-header'
import { ProductsFilteredList } from '@/components/products/products-filtered-list'
import { NoStoresError } from '@/components/dashboard/no-stores-error'

interface InventoryProductsPageProps {
  searchParams: Promise<{
    category?: string
    sort?: string
    direction?: string
  }>
}

export default async function InventoryProductsPage({ searchParams }: InventoryProductsPageProps) {
  // Await searchParams as required in Next.js 15
  const params = await searchParams
  const { queryClient } = await createPrefetchedQuery()
  const serverClient = await createServerClient()

  // Get current authenticated user
  const {
    data: { user },
    error: authError,
  } = await serverClient.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  try {
    // Prefetch user stores and preferences
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.stores.userStores(user.id),
        queryFn: () => fetchUserStores(user.id, serverClient),
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.userPreferences.detail(user.id),
        queryFn: () => fetchUserPreferences(serverClient),
        staleTime: 5 * 60 * 1000,
      }),
    ])

    // Get user's stores to determine which store to prefetch products for
    const stores = await fetchUserStores(user.id, serverClient)
    const preferences = await fetchUserPreferences(serverClient)

    if (stores.length === 0) {
      // User has no stores - show error instead of redirecting
      return <NoStoresError />
    }
    // Determine which store to prefetch data for
    const primaryStoreId = preferences?.primary_store_id
    const primaryStore = stores.find(s => s.store.store_id === primaryStoreId)
    const storeToUse = primaryStore ? primaryStore.store : stores[0].store

    // Build filters based on search params
    const filters: ProductFilters = { storeId: storeToUse.store_id }

    // Handle category filter
    if (params.category) {
      filters.category = params.category
    }

    // Handle sorting
    if (params.sort) {
      filters.sort = {
        field: params.sort as SortField,
        direction: (params.direction || 'asc') as 'asc' | 'desc',
      }
    }

    // Prefetch the first page of products with filters
    await queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.products.infinite(storeToUse.store_id, filters),
      queryFn: ({ pageParam = 0 }) =>
        fetchProductsPage({ page: pageParam, pageSize: 20 }, filters, serverClient),
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextPage,
      pages: 1, // Only prefetch first page
    })

    console.log(
      '[InventoryProductsPage] Prefetched data for store:',
      storeToUse.store_name,
      'with filters:',
      filters,
    )
  } catch (error) {
    console.error('[InventoryProductsPage] Error prefetching data:', error)
    // Continue without prefetch - client will handle loading
  }

  const pageTitle = 'Inventory Products'
  const pageDescription = "View and manage your store's product inventory"

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <ProductsHeader title={pageTitle} description={pageDescription} />

        {/* Client-side filtered product list */}
        <ProductsFilteredList
          initialFilters={{
            category: params.category,
            sort: params.sort,
            direction: params.direction,
          }}
        />
      </div>
    </HydrationBoundary>
  )
}
