'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useStoreState } from '@/lib/stores/store-context'
import { fetchStoreUsersPage } from '@/lib/queries/store-users'
import { queryKeys } from '@/lib/queries/query-keys'

/**
 * This component handles prefetching store users data when the active store changes.
 * It ensures that when a user switches stores, the user data is preloaded for better UX.
 */
export function StoreUsersPrefetch() {
  const queryClient = useQueryClient()
  const { activeStore } = useStoreState()

  useEffect(() => {
    if (!activeStore?.store_id) return

    const storeId = activeStore.store_id

    // Prefetch the main store users data when store changes
    const prefetchStoreUsers = async () => {
      try {
        // Only prefetch if we don't already have recent data
        const existingData = queryClient.getQueryData(queryKeys.storeUsers.infinite(storeId, {}))

        if (!existingData) {
          console.log('[StoreUsersPrefetch] Prefetching store users for:', activeStore.store_name)

          // Prefetch first page of all users
          await queryClient.prefetchInfiniteQuery({
            queryKey: queryKeys.storeUsers.infinite(storeId, {}),
            queryFn: ({ pageParam = 0 }) =>
              fetchStoreUsersPage(storeId, { page: pageParam, pageSize: 20 }, {}),
            initialPageParam: 0,
            staleTime: 5 * 60 * 1000, // 5 minutes
          })

          // Prefetch active users for stats
          await queryClient.prefetchInfiniteQuery({
            queryKey: queryKeys.storeUsers.infinite(storeId, { is_active: true }),
            queryFn: ({ pageParam = 0 }) =>
              fetchStoreUsersPage(storeId, { page: pageParam, pageSize: 20 }, { is_active: true }),
            initialPageParam: 0,
            staleTime: 5 * 60 * 1000,
          })

          // Prefetch users by role for quick stats
          const roles = ['owner', 'manager', 'employee'] as const
          await Promise.all(
            roles.map(role =>
              queryClient.prefetchInfiniteQuery({
                queryKey: queryKeys.storeUsers.infinite(storeId, { role_in_store: role }),
                queryFn: ({ pageParam = 0 }) =>
                  fetchStoreUsersPage(
                    storeId,
                    { page: pageParam, pageSize: 20 },
                    { role_in_store: role },
                  ),
                initialPageParam: 0,
                staleTime: 5 * 60 * 1000,
              }),
            ),
          )

          console.log('[StoreUsersPrefetch] Successfully prefetched store users data')
        }
      } catch (error) {
        console.error('[StoreUsersPrefetch] Error prefetching store users:', error)
      }
    }

    // Small delay to avoid prefetching during rapid store switching
    const timeoutId = setTimeout(prefetchStoreUsers, 500)

    return () => clearTimeout(timeoutId)
  }, [activeStore?.store_id, queryClient, activeStore?.store_name])

  // Also invalidate old store data when switching to keep cache clean
  useEffect(() => {
    if (!activeStore?.store_id) return

    // Clean up queries for other stores (keep cache size manageable)
    const allQueries = queryClient.getQueryCache().getAll()
    const storeUserQueries = allQueries.filter(
      query => query.queryKey[0] === 'storeUsers' && query.queryKey[2] !== activeStore.store_id,
    )

    // Remove old store user data (older than 10 minutes)
    storeUserQueries.forEach(query => {
      const queryAge = Date.now() - (query.state.dataUpdatedAt || 0)
      if (queryAge > 10 * 60 * 1000) {
        // 10 minutes
        queryClient.removeQueries({ queryKey: query.queryKey })
      }
    })
  }, [activeStore?.store_id, queryClient])

  // This component doesn't render anything
  return null
}
