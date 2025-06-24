// app/products/page.tsx (Server Component)
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { fetchProductsPage } from '@/lib/queries/products'
import { queryKeys } from '@/lib/queries/query-keys'
import { ProductsList } from '@/components/products/product-list'
import { AuthStatus } from '@/components/debug/auth-status'

export default async function ProductsPage() {
  const { queryClient } = await createPrefetchedQuery()
  const serverClient = await createServerClient()

  // Prefetch the first page with the same query key that the client will use
  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.products.infinite({}), // Same key as useProducts hook!
    queryFn: ({ pageParam = 0 }) =>
      fetchProductsPage({ page: pageParam, pageSize: 20 }, {}, serverClient),
    initialPageParam: 0,
    getNextPageParam: lastPage => lastPage.nextPage,
    pages: 1, // Only prefetch first page
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Products</h1>
          
          {/* Add action buttons here later */}
        </div>

        <ProductsList />
      </div>
    </HydrationBoundary>
  )
}
