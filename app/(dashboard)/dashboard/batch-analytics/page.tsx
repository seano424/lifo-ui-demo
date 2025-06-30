// app/dashboard/batches/page.tsx

import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { fetchBatchesPage, fetchExpiringBatches } from '@/lib/queries/batches'
import { queryKeys } from '@/lib/queries/query-keys'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { BatchList } from '@/components/batches/batch-list'
import { BatchDashboardStats } from '@/components/batches/batch-dashboard-stats'

export default async function BatchesPage() {
  const { queryClient } = await createPrefetchedQuery()
  const supabase = await createServerClient()

  // Prefetch first page of batches
  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.batches.infinite({}),
    queryFn: () => fetchBatchesPage({ page: 0, pageSize: 20 }, {}, supabase),
    initialPageParam: 0,
  })

  // Prefetch expiring batches for dashboard stats
  await queryClient.prefetchQuery({
    queryKey: queryKeys.batches.infinite({ expiringInDays: 7 }),
    queryFn: () => fetchExpiringBatches(7, supabase),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Inventory Batches</h1>
        </div>

        {/* Dashboard Stats */}
        <BatchDashboardStats />

        {/* Main Batch List */}
        <BatchList title="All Batches" />
      </div>
    </HydrationBoundary>
  )
}
