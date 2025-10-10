import { dehydrate } from '@tanstack/react-query'
import { getActiveStoreCookie } from '@/lib/actions/store-actions'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchCategories } from '@/lib/queries/products'
import {
  fetchUserStores,
  selectDefaultStore,
  type Store,
  type UserPreferences,
  type UserStore,
} from '@/lib/queries/stores'
import { fetchUserPreferencesRPC } from '@/lib/queries/stores-rpc'
import { fetchCurrentUser } from '@/lib/queries/users'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
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
    logger.queryWarn('prefetchCurrentUser', 'Failed to prefetch current user', { error })
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
    let user = null
    try {
      const { data, error: authError } = await supabase.auth.getUser()

      if (authError) {
        // Check if it's a transient fetch error vs actual auth error
        if (authError.message?.includes('fetch failed')) {
          logger.queryWarn(
            'prefetchDashboardData',
            'Auth fetch failed (likely transient), returning empty state',
          )
          // Return empty state - client will handle auth check
          return {
            queryClient,
            dehydratedState: dehydrate(queryClient),
            error: new Error('Auth check temporarily unavailable'),
          }
        }
        throw new Error('Authentication required')
      }

      user = data?.user
    } catch (authFetchError) {
      // Handle fetch errors gracefully
      const errorMessage =
        authFetchError instanceof Error ? authFetchError.message : String(authFetchError)
      if (errorMessage.includes('fetch failed')) {
        logger.queryWarn(
          'prefetchDashboardData',
          'Auth check failed due to network issue, returning empty state',
        )
        return {
          queryClient,
          dehydratedState: dehydrate(queryClient),
          error: new Error('Auth check temporarily unavailable'),
        }
      }
      throw authFetchError
    }

    if (!user) {
      throw new Error('Authentication required')
    }

    // Prefetch shared data that rarely changes
    await Promise.all([
      // Current user data
      queryClient.prefetchQuery({
        queryKey: ['currentUser'],
        queryFn: () => fetchCurrentUser(supabase),
        staleTime: 5 * 60 * 1000,
      }),
      // Categories (shared across all stores and pages)
      queryClient.prefetchQuery({
        queryKey: queryKeys.categories.list,
        queryFn: () => fetchCategories(supabase),
        staleTime: 10 * 60 * 1000, // 10 minutes - categories rarely change
        gcTime: 30 * 60 * 1000, // 30 minutes
      }),
    ])

    // Fetch and prefetch user stores (with graceful fallback)
    let userStores: UserStore[] = []
    let userPreferences: UserPreferences | null = null

    try {
      userStores = await fetchUserStores(user.id, supabase)
      await queryClient.prefetchQuery({
        queryKey: queryKeys.stores.userStores(user.id),
        queryFn: () => userStores,
        staleTime: 2 * 60 * 1000, // 2 minutes - stores don't change often
      })
    } catch (storeError) {
      logger.queryWarn(
        'prefetchDashboardData',
        'Failed to prefetch user stores, will fetch on client',
        {
          error: storeError instanceof Error ? storeError.message : String(storeError),
        },
      )
      // Don't throw - let client fetch this data
    }

    // Fetch user preferences using optimized RPC (with graceful fallback)
    try {
      userPreferences = await fetchUserPreferencesRPC(supabase)
      await queryClient.prefetchQuery({
        queryKey: queryKeys.userPreferences.detail(user.id),
        queryFn: () => userPreferences,
        staleTime: 10 * 60 * 1000, // 10 minutes - preferences rarely change
      })
    } catch (prefError) {
      logger.queryWarn(
        'prefetchDashboardData',
        'Failed to prefetch user preferences, will fetch on client',
        {
          error: prefError instanceof Error ? prefError.message : String(prefError),
        },
      )
      // Don't throw - let client fetch this data
    }

    // Get active store from cookies and use smart selection
    let targetStore: Store | null = null

    if (userStores.length > 0) {
      const lastActiveStoreId = await getActiveStoreCookie()
      const primaryStoreId = userPreferences?.primary_store_id

      // Use smart selection logic
      targetStore = selectDefaultStore(
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
    }

    return {
      queryClient,
      dehydratedState: dehydrate(queryClient),
      user,
      userStores,
      activeStore: targetStore,
    }
  } catch (error) {
    // Log connection errors more gracefully
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isConnectionError =
      errorMessage.includes('ECONNRESET') || errorMessage.includes('fetch failed')

    if (isConnectionError) {
      logger.queryWarn(
        'prefetchDashboardData',
        'Connection error during dashboard prefetch (retries will be attempted)',
        { error: errorMessage },
      )
    } else {
      logger.queryWarn('prefetchDashboardData', 'Failed to prefetch dashboard data', { error })
    }

    return {
      queryClient,
      dehydratedState: dehydrate(queryClient),
      error,
    }
  }
}
