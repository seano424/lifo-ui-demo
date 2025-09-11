import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { redirect } from 'next/navigation'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { NoStoresError } from '@/components/dashboard/no-stores-error'
import { TodosFilteredList } from '@/components/todos/todos-filtered-list'
import { fetchUserPreferences, fetchUserStores } from '@/lib/queries/stores'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { createClient as createServerClient } from '@/lib/supabase/server'

interface TodosPageProps {
  searchParams: Promise<{
    tab?: string
    urgency?: string
    sort?: string
    direction?: string
  }>
}

export default async function TodosPage({ searchParams }: TodosPageProps) {
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
        queryKey: ['stores', 'userStores', user.id],
        queryFn: () => fetchUserStores(user.id, serverClient),
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['userPreferences', user.id],
        queryFn: () => fetchUserPreferences(serverClient),
        staleTime: 5 * 60 * 1000,
      }),
    ])

    // Get user's stores to determine which store to prefetch data for
    const stores = await fetchUserStores(user.id, serverClient)
    const preferences = await fetchUserPreferences(serverClient)

    if (stores.length === 0) {
      // User has no stores - show error instead of redirecting
      return <NoStoresError />
    }

    // Determine which store to prefetch data for
    const primaryStoreId = preferences?.primary_store_id
    const primaryStore = stores.find(s => s.store.store_id === primaryStoreId)
    const _storeToUse = primaryStore ? primaryStore.store : stores[0].store

    // TODO: Add prefetching for todos data based on active tab
    // For now, we'll let the client components handle loading
  } catch (error) {
    console.error('[TodosPage] Error prefetching data:', error)
    // Continue without prefetch - client will handle loading
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex flex-col gap-6">
        <DashboardInsetHeader
          title="Todos"
          description="Manage actionable inventory items and track your progress"
        />

        <TodosFilteredList
          initialFilters={{
            tab: params.tab,
            urgency: params.urgency,
            sort: params.sort,
            direction: params.direction,
          }}
        />
      </div>
    </HydrationBoundary>
  )
}
