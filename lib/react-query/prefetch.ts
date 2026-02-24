import { dehydrate } from '@tanstack/react-query'
import { getActiveStoreCookie } from '@/lib/actions/store-actions'
import { queryKeys } from '@/lib/queries/query-keys'
import {
  fetchUserStores,
  selectDefaultStore,
  type Store,
  type UserPreferences,
  type UserStore,
} from '@/lib/queries/stores'
import { fetchUserPreferencesRPC } from '@/lib/queries/stores-rpc'
import { fetchCurrentUser, transformAuthUserToUser } from '@/lib/queries/users'
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
    // getClaims() validates the JWT locally using the project's public key (ES256/asymmetric).
    // No network call — ~1ms. Safe here because middleware (proxy.ts) gates all dashboard
    // routes and also uses getClaims(). RLS enforces row-level access at the DB layer.
    const { data, error: authError } = await timed('auth.getClaims', () =>
      supabase.auth.getClaims(),
    )

    if (authError || !data?.claims) {
      throw new Error('Authentication required')
    }

    const user = { id: data.claims.sub as string }

    // Seed currentUser from JWT claims — synchronous, no network call.
    // claims contains email, phone, and user_metadata (full_name, avatar_url, etc.).
    // created_at/updated_at are absent from claims and will be '' until useCurrentUser
    // refetches (~30s staleTime on the client hook), which is acceptable.
    const currentUserFromClaims = transformAuthUserToUser({
      id: data.claims.sub,
      email: data.claims.email ?? '',
      phone: (data.claims.phone as string | undefined) ?? null,
      user_metadata: (data.claims.user_metadata as Record<string, unknown>) ?? {},
    })
    queryClient.setQueryData(queryKeys.auth.currentUser(), currentUserFromClaims)
    logger.query('prefetchDashboardData', '  ✓ currentUser (from claims) — 0ms')

    // Kick off cookie read early — it doesn't depend on any DB call
    const activeStoreCookiePromise = getActiveStoreCookie()

    // Prefetch DB-dependent data in parallel. currentUser is already seeded above,
    // so we only wait on the two DB queries.
    const prefetchStart = performance.now()
    const results = await Promise.allSettled([
      timed('userStores', () => fetchUserStores(user.id, supabase)),
      timed('userPreferences', () => fetchUserPreferencesRPC(supabase)),
    ])
    const prefetchDuration = performance.now() - prefetchStart

    // Log any failed prefetches
    const queryNames = ['userStores', 'userPreferences']
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

    const userStoresResult = results[0]
    if (userStoresResult.status === 'fulfilled') {
      userStores = userStoresResult.value as UserStore[]
      await queryClient.prefetchQuery({
        queryKey: queryKeys.stores.userStores(user.id),
        queryFn: () => userStores,
        staleTime: 2 * 60 * 1000,
      })
    }

    const userPreferencesResult = results[1]
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
        await timed('activeStore (cache write)', () =>
          queryClient.prefetchQuery({
            queryKey: ['activeStore'],
            queryFn: async () => targetStore,
            staleTime: 2 * 60 * 1000,
          }),
        )
      }
    }

    const totalDuration = performance.now() - perfStart
    logger.query(
      'prefetchDashboardData',
      `Dashboard prefetch completed in ${totalDuration.toFixed(0)}ms (prefetch: ${prefetchDuration.toFixed(0)}ms)`,
    )

    return {
      queryClient,
      dehydratedState: dehydrate(queryClient),
      user,
      userStores: userStores || [],
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
