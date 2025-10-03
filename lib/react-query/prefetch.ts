import { dehydrate } from '@tanstack/react-query'
import { getActiveStoreCookie } from '@/lib/actions/store-actions'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchUserPreferences, fetchUserStores, selectDefaultStore } from '@/lib/queries/stores'
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

  try {
    // Get the current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Authentication required')
    }

    // Prefetch current user data
    await queryClient.prefetchQuery({
      queryKey: ['currentUser'],
      queryFn: () => fetchCurrentUser(supabase),
      staleTime: 5 * 60 * 1000,
    })

    // Prefetch auth user data (removed - duplicate of currentUser query above)

    // Fetch and prefetch user stores
    const userStores = await fetchUserStores(user.id, supabase)

    await queryClient.prefetchQuery({
      queryKey: queryKeys.stores.userStores(user.id),
      queryFn: () => userStores,
      staleTime: 2 * 60 * 1000, // 2 minutes - stores don't change often
    })

    // Fetch user preferences
    const userPreferences = await fetchUserPreferences(supabase)

    await queryClient.prefetchQuery({
      queryKey: queryKeys.userPreferences.detail(user.id),
      queryFn: () => userPreferences,
      staleTime: 5 * 60 * 1000,
    })

    // Get active store from cookies and use smart selection
    const lastActiveStoreId = await getActiveStoreCookie()
    const primaryStoreId = userPreferences?.primary_store_id

    // Use smart selection logic
    const targetStore = selectDefaultStore(
      userStores,
      primaryStoreId || null,
      lastActiveStoreId || null,
    )

    if (targetStore) {
      await queryClient.prefetchQuery({
        queryKey: ['activeStore'],
        queryFn: async () => targetStore,
        staleTime: 2 * 60 * 1000,
      })
    }

    return {
      queryClient,
      dehydratedState: dehydrate(queryClient),
      user,
      userStores,
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
