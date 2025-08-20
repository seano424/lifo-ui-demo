import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { fetchProductsPage } from '@/lib/queries/products'
import { fetchUserStores, fetchUserPreferences } from '@/lib/queries/stores'
import { queryKeys } from '@/lib/queries/query-keys'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { ProductSortList } from '@/components/products/product-sort-list'
import { StoreHeaderDisplay } from '@/components/stores/store-header-display'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'

export default async function ProductsPage() {
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
      // User has no stores - redirect to onboarding or show error
      redirect('/onboarding')
    }

    // Determine which store to prefetch data for
    const primaryStoreId = preferences?.primary_store_id
    const primaryStore = stores.find(s => s.store.store_id === primaryStoreId)
    const storeToUse = primaryStore ? primaryStore.store : stores[0].store

    // Prefetch the first page of products for the user's primary/first store
    await queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.products.infinite(storeToUse.store_id, {}),
      queryFn: ({ pageParam = 0 }) =>
        fetchProductsPage(
          { page: pageParam, pageSize: 20 },
          { storeId: storeToUse.store_id },
          serverClient,
        ),
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextPage,
      pages: 1, // Only prefetch first page
    })

    console.log('[ProductsPage] Prefetched data for store:', storeToUse.store_name)
  } catch (error) {
    console.error('[ProductsPage] Error prefetching data:', error)
    // Continue without prefetch - client will handle loading
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        {/* Store Context Header */}
        <StoreHeaderDisplay variant="compact" showAddress={false} />

        <DashboardInsetHeader
          title="Products"
          description="View and manage your store's product inventory"
          rightContent={
            <div className="flex gap-2">
              <Button variant="outline">Export Products</Button>
              <Button>Add Product</Button>
            </div>
          }
        />

        {/* Store-aware product list */}
        <ProductSortList />
      </div>
    </HydrationBoundary>
  )
}
