import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { fetchBatchesPage, fetchExpiringBatches } from '@/lib/queries/batches'
import { queryKeys } from '@/lib/queries/query-keys'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { BatchList } from '@/components/batches/batch-list'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

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
        <DashboardInsetHeader
          title="Batch Analytics"
          description="View and manage your inventory batches"
          rightContent={
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Export Batches
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Add Batch
              </button>
            </div>
          }
        />

        <BatchList title="All Batches" />
      </div>
    </HydrationBoundary>
  )
}
