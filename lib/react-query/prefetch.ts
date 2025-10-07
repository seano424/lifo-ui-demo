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

  try {
    // Get the current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Authentication required')
    }

    // Prefetch all critical data in parallel for maximum performance
    const [currentUserData, categories, userStores, userPreferences] = await Promise.all([
      // Current user data
      fetchCurrentUser(supabase),
      // Categories (shared across all stores and pages)
      fetchCategories(supabase),
      // User stores (fetch immediately for parallel execution)
      fetchUserStores(user.id, supabase),
      // User preferences using optimized RPC
      fetchUserPreferencesRPC(supabase),
    ])

    // Prefetch all queries in parallel
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['currentUser'],
        queryFn: () => currentUserData,
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.categories.list,
        queryFn: () => categories,
        staleTime: 10 * 60 * 1000, // 10 minutes - categories rarely change
        gcTime: 30 * 60 * 1000, // 30 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.stores.userStores(user.id),
        queryFn: () => userStores,
        staleTime: 2 * 60 * 1000, // 2 minutes - stores don't change often
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.userPreferences.detail(user.id),
        queryFn: () => userPreferences,
        staleTime: 10 * 60 * 1000, // 10 minutes - preferences rarely change
      }),
    ])

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
