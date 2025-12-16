import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { redirect } from 'next/navigation'
import { NoStoresError } from '@/components/dashboard/no-stores-error'
import { ProductsFilteredList } from '@/components/products/products-filtered-list'
import ProductsHeader from '@/components/products/products-header'
import type { ProductFilters, SortField } from '@/lib/queries/products'
import { fetchProductsPageRPC } from '@/lib/queries/products-rpc'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchUserPreferences, fetchUserStores } from '@/lib/queries/stores'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

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
    // Fetch stores and preferences (layout has them cached in client but we need them server-side)
    const [stores, preferences] = await Promise.all([
      fetchUserStores(user.id, serverClient),
      fetchUserPreferences(serverClient),
    ])

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

    // Handle sorting - match client default
    if (params.sort) {
      filters.sort = {
        field: params.sort as SortField,
        direction: (params.direction || 'asc') as 'asc' | 'desc',
      }
    } else {
      // Default sort matches client-side default in ProductsFilteredList
      filters.sort = { field: 'created_at', direction: 'desc' }
    }

    // Prefetch the first page of products with filters (using optimized RPC)
    await queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.products.infinite(storeToUse.store_id, filters),
      queryFn: ({ pageParam = 0 }) =>
        fetchProductsPageRPC({ page: pageParam, pageSize: 100 }, filters, serverClient),
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextPage,
      pages: 1, // Only prefetch first page
    })
  } catch (error) {
    logger.queryWarn('InventoryProductsPage', 'Error prefetching data', {
      error,
    })
    // Continue without prefetch - client will handle loading
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6 container md:py-6 lg:py-8">
        <ProductsHeader />

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
