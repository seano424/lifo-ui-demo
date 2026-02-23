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
import {
  BatchTrackingSetupResponseSchema,
  type BatchTrackingSetupResponse,
} from '@/lib/validation/rpc-schemas'
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
  const perfStart = performance.now()

  // Tiny helper: resolves the promise and logs how long it took.
  // Only emits when NEXT_PUBLIC_LOG_QUERIES=true so it's zero-noise in prod.
  async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const t0 = performance.now()
    try {
      const result = await fn()
      logger.query(
        'prefetchDashboardData',
        `  ✓ ${label} — ${(performance.now() - t0).toFixed(0)}ms`,
      )
      return result
    } catch (err) {
      logger.query(
        'prefetchDashboardData',
        `  ✗ ${label} — ${(performance.now() - t0).toFixed(0)}ms (failed)`,
      )
      throw err
    }
  }

  try {
    // Get the current authenticated user
    let user = null
    try {
      const { data, error: authError } = await timed('auth.getUser', () => supabase.auth.getUser())

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

    // Kick off cookie read early — it doesn't depend on any DB call
    const activeStoreCookiePromise = getActiveStoreCookie()

    // Prefetch all critical data in parallel with Promise.allSettled for resilience.
    // userStores and userPreferences only need user.id (already resolved above),
    // so they can run alongside currentUser and categories — no need to serialize.
    const prefetchStart = performance.now()
    const results = await Promise.allSettled([
      timed('currentUser', () =>
        queryClient.prefetchQuery({
          queryKey: ['currentUser'],
          queryFn: () => fetchCurrentUser(supabase),
          staleTime: 5 * 60 * 1000,
        }),
      ),
      timed('categories', () =>
        queryClient.prefetchQuery({
          queryKey: queryKeys.categories.list,
          queryFn: () => fetchCategories(supabase),
          staleTime: 10 * 60 * 1000,
          gcTime: 30 * 60 * 1000,
        }),
      ),
      timed('userStores', () => fetchUserStores(user.id, supabase)),
      timed('userPreferences', () => fetchUserPreferencesRPC(supabase)),
    ])
    const prefetchDuration = performance.now() - prefetchStart

    // Log any failed prefetches
    const queryNames = ['currentUser', 'categories', 'userStores', 'userPreferences']
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.queryWarn('prefetchDashboardData', `Failed to prefetch ${queryNames[index]}`, {
          error: result.reason,
        })
      }
    })

    // Extract userStores and userPreferences from allSettled results
    let userStores: UserStore[] = []
    let userPreferences: UserPreferences | null = null

    const userStoresResult = results[2]
    if (userStoresResult.status === 'fulfilled') {
      userStores = userStoresResult.value as UserStore[]
      await queryClient.prefetchQuery({
        queryKey: queryKeys.stores.userStores(user.id),
        queryFn: () => userStores,
        staleTime: 2 * 60 * 1000,
      })
    }

    const userPreferencesResult = results[3]
    if (userPreferencesResult.status === 'fulfilled') {
      userPreferences = userPreferencesResult.value as UserPreferences | null
      await queryClient.prefetchQuery({
        queryKey: queryKeys.userPreferences.detail(user.id),
        queryFn: () => userPreferences,
        staleTime: 10 * 60 * 1000,
      })
    }

    // Get active store from cookies and use smart selection
    let targetStore: Store | null = null

    if (userStores.length > 0) {
      const lastActiveStoreId = await activeStoreCookiePromise
      const primaryStoreId = userPreferences?.primary_store_id

      // Use smart selection logic
      targetStore = selectDefaultStore(
        userStores,
        primaryStoreId || null,
        lastActiveStoreId || null,
      )

      if (targetStore) {
        const storeId = targetStore.store_id
        // Prefetch active store, urgent todos count, and batch tracking setup in parallel
        await Promise.all([
          timed('activeStore (cache write)', () =>
            queryClient.prefetchQuery({
              queryKey: ['activeStore'],
              queryFn: async () => targetStore,
              staleTime: 2 * 60 * 1000,
            }),
          ),
          timed('batchTrackingSetup', () =>
            queryClient.prefetchQuery({
              queryKey: queryKeys.batchTrackingOnboarding.config(storeId),
              queryFn: async () => {
                const { data, error } = await supabase.rpc('get_batch_tracking_setup', {
                  p_store_id: storeId,
                })
                if (error) {
                  logger.queryWarn(
                    'prefetchDashboardData',
                    'Failed to prefetch batch tracking setup',
                    {
                      error: error.message,
                      storeId,
                    },
                  )
                  return null
                }
                return data ? BatchTrackingSetupResponseSchema.parse(data) : null
              },
              staleTime: 2 * 60 * 1000,
            }),
          ),
        ])
      }
    }

    const totalDuration = performance.now() - perfStart
    logger.query(
      'prefetchDashboardData',
      `Dashboard prefetch completed in ${totalDuration.toFixed(0)}ms (prefetch: ${prefetchDuration.toFixed(0)}ms)`,
    )

    // Read batch tracking setup status from the cache (populated by the prefetch above)
    const batchSetupCached = targetStore
      ? queryClient.getQueryData<BatchTrackingSetupResponse | null>(
          queryKeys.batchTrackingOnboarding.config(targetStore.store_id),
        )
      : null
    const setupCompleted = batchSetupCached?.config?.setup_completed ?? false

    return {
      queryClient,
      dehydratedState: dehydrate(queryClient),
      user,
      userStores: userStores || [],
      activeStore: targetStore,
      setupCompleted,
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
