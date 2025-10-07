import { dehydrate } from '@tanstack/react-query'
import { getActiveStoreCookie } from '@/lib/actions/store-actions'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchCategories } from '@/lib/queries/products'
import { fetchUserStores, selectDefaultStore } from '@/lib/queries/stores'
import { fetchUserPreferencesRPC } from '@/lib/queries/stores-rpc'
import { fetchCurrentUser } from '@/lib/queries/users'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createQueryClient } from './client'

export async function createPrefetchedQuery() {
  const queryClient = createQueryClient()
  return { queryClient, dehydratedState: dehydrate(queryClient) }
}

export async function prefetchCurrentUser() {
  const queryClient = createQueryClient()
  const supabase = await createServerClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: ['currentUser'],
      queryFn: () => fetchCurrentUser(supabase),
      staleTime: 5 * 60 * 1000, // 5 minutes - user data doesn't change often
    })

    return {
      queryClient,
      dehydratedState: dehydrate(queryClient),
    }
  } catch (error) {
    console.error('Failed to prefetch current user:', error)
    return {
      queryClient,
      dehydratedState: dehydrate(queryClient),
    }
  }
}

export async function prefetchDashboardData() {
  const queryClient = createQueryClient()
  const supabase = await createServerClient()
  const perfStart = performance.now()

  try {
    // Get the current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Authentication required')
    }

    // Prefetch all critical data in parallel with Promise.allSettled for resilience
    const prefetchStart = performance.now()
    const results = await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ['currentUser'],
        queryFn: () => fetchCurrentUser(supabase),
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.categories.list,
        queryFn: () => fetchCategories(supabase),
        staleTime: 10 * 60 * 1000, // 10 minutes - categories rarely change
        gcTime: 30 * 60 * 1000, // 30 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.stores.userStores(user.id),
        queryFn: () => fetchUserStores(user.id, supabase),
        staleTime: 2 * 60 * 1000, // 2 minutes - stores don't change often
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.userPreferences.detail(user.id),
        queryFn: () => fetchUserPreferencesRPC(supabase),
        staleTime: 10 * 60 * 1000, // 10 minutes - preferences rarely change
      }),
    ])
    const prefetchDuration = performance.now() - prefetchStart

    // Log any failed prefetches
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const queries = ['currentUser', 'categories', 'userStores', 'userPreferences']
        console.error(`Failed to prefetch ${queries[index]}:`, result.reason)
      }
    })

    // Retrieve cached data with proper type safety and null checks
    type UserStore = Awaited<ReturnType<typeof fetchUserStores>>[number]
    type UserPreferences = Awaited<ReturnType<typeof fetchUserPreferencesRPC>>

    const userStores = queryClient.getQueryData<UserStore[]>(queryKeys.stores.userStores(user.id))
    const userPreferences = queryClient.getQueryData<UserPreferences | null>(
      queryKeys.userPreferences.detail(user.id),
    )

    // Get active store from cookies and use smart selection
    const lastActiveStoreId = await getActiveStoreCookie()
    const primaryStoreId = userPreferences?.primary_store_id

    // Use smart selection logic with null safety
    const targetStore =
      userStores && userStores.length > 0
        ? selectDefaultStore(userStores, primaryStoreId || null, lastActiveStoreId || null)
        : null

    if (targetStore) {
      // Prefetch active store and urgent todos count in parallel
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['activeStore'],
          queryFn: async () => targetStore,
          staleTime: 2 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.todos.urgentCount(targetStore.store_id),
          queryFn: async () => {
            const { fetchUrgentTodosCount } = await import('@/lib/queries/todos-urgent-count')
            return fetchUrgentTodosCount(targetStore.store_id, supabase)
          },
          staleTime: 2 * 60 * 1000,
        }),
      ])
    }

    const totalDuration = performance.now() - perfStart
    console.log(
      `[Performance] Dashboard prefetch completed in ${totalDuration.toFixed(0)}ms (prefetch: ${prefetchDuration.toFixed(0)}ms)`,
    )

    return {
      queryClient,
      dehydratedState: dehydrate(queryClient),
      user,
      userStores: userStores || [],
      activeStore: targetStore,
    }
  } catch (error) {
    console.error('Failed to prefetch dashboard data:', error)

    return {
      queryClient,
      dehydratedState: dehydrate(queryClient),
      error,
    }
  }
}
