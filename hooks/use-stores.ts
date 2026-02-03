import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { setActiveStoreCookie } from '@/lib/actions/store-actions'
import { queryKeys } from '@/lib/queries/query-keys'
import {
  fetchStoreById,
  fetchUserStores,
  type Store,
  selectDefaultStore,
  updateUserPrimaryStore,
} from '@/lib/queries/stores'
import { fetchUserPreferencesRPC } from '@/lib/queries/stores-rpc'
import { useStoreState } from '@/lib/stores/store-context'
import { logger } from '@/lib/utils/logger'
import { useCurrentUser } from './use-users'

const ACTIVE_STORE_KEY = 'activeStoreId'

// Hook to get user's stores and automatically set active store
export function useUserStores() {
  const { data: currentUser } = useCurrentUser()
  const { setActiveStore, setUserStores, setLoadingStores, activeStore, userStores } =
    useStoreState()

  const userStoresResult = useQuery({
    queryKey: queryKeys.stores.userStores(currentUser?.id || ''),
    queryFn: () => {
      return fetchUserStores(currentUser?.id || '')
    },
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false, // Don't refetch if we have cached data
    refetchOnWindowFocus: false, // Don't refetch on window focus
  })

  const userPreferencesResult = useQuery({
    queryKey: queryKeys.userPreferences.detail(currentUser?.id || ''),
    queryFn: () => fetchUserPreferencesRPC(),
    enabled: !!currentUser?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - preferences rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false, // Don't refetch if we have cached data
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
  })

  // Consolidated effect: Handle loading state, store selection, and completion
  useEffect(() => {
    // If no user, immediately set loading to false
    if (!currentUser) {
      setLoadingStores(false)
      return
    }

    const isLoading = userStoresResult.isLoading || userPreferencesResult.isLoading

    // Keep loading true while queries are running
    if (isLoading) {
      setLoadingStores(true)
      return
    }

    // Queries are complete - handle store selection and sync
    if (userStoresResult.data && userStoresResult.data.length > 0) {
      // Always sync Zustand with React Query data
      setUserStores(userStoresResult.data)

      // Only auto-select if no active store yet
      if (!activeStore) {
        // Get last active store from localStorage
        const lastActiveStoreId =
          typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_STORE_KEY) : null
        const primaryStoreId = userPreferencesResult.data?.primary_store_id

        // Use smart selection logic
        const storeToSelect = selectDefaultStore(
          userStoresResult.data,
          primaryStoreId || null,
          lastActiveStoreId,
        )

        if (storeToSelect) {
          setActiveStore(storeToSelect)
          // Also sync cookie for server-side consistency
          setActiveStoreCookie(storeToSelect.store_id).catch(error => {
            logger.error('hooks/use-stores', 'Failed to sync active store cookie', {
              error: error instanceof Error ? error.message : String(error),
              storeId: storeToSelect.store_id,
            })
          })
        }
      }
    }

    // Clear loading state if we have an active store OR if user has no stores
    if (activeStore || (userStoresResult.data && userStoresResult.data.length === 0)) {
      setLoadingStores(false)
    }
  }, [
    currentUser,
    userStoresResult.data,
    userStoresResult.isLoading,
    userPreferencesResult.data,
    userPreferencesResult.isLoading,
    activeStore,
    setActiveStore,
    setUserStores,
    setLoadingStores,
  ])

  return {
    userStores: userStores, // Return the UserStore[] from Zustand
    isLoading: userStoresResult.isLoading || userPreferencesResult.isLoading,
    error: userStoresResult.error || userPreferencesResult.error,
    // Add a function to manually refresh Zustand from React Query
    refreshFromQuery: () => {
      if (userStoresResult.data) {
        setUserStores(userStoresResult.data)
      }
    },
  }
}

// Hook to switch stores with cache invalidation
export function useStoreActions() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: currentUser } = useCurrentUser()
  const { setActiveStore, setChangingStore, activeStore } = useStoreState()

  const updatePrimaryStoreMutation = useMutation({
    mutationFn: ({ userId, storeId }: { userId: string; storeId: string }) =>
      updateUserPrimaryStore(userId, storeId),
    onSuccess: () => {
      // Invalidate user preferences to refresh primary_store_id
      if (currentUser) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.userPreferences.detail(currentUser.id),
        })
      }
      toast.success('Primary store updated')
    },
    onError: () => {
      toast.error('Failed to update primary store')
    },
  })

  const switchStore = async (newStore: Store, makePrimary: boolean = false) => {
    if (!currentUser || newStore.store_id === activeStore?.store_id) {
      return
    }

    setChangingStore(true)

    try {
      // Update active store in state (localStorage persistence happens automatically in setActiveStore)
      setActiveStore(newStore)

      // Also set cookie for server-side persistence
      await setActiveStoreCookie(newStore.store_id)

      // Refresh server components to re-render with new store data
      router.refresh()

      // Invalidate all store-specific queries to refetch for new store
      queryClient.invalidateQueries({
        queryKey: ['products', 'byStore'],
      })
      queryClient.invalidateQueries({
        queryKey: ['batches', 'byStore'],
      })

      // Update primary store in database only if requested
      if (makePrimary) {
        updatePrimaryStoreMutation.mutate({
          userId: currentUser.id,
          storeId: newStore.store_id,
        })
        toast.success(`${newStore.store_name} set as primary store`)
      }
    } catch (error) {
      logger.error('hooks/use-stores', 'Failed to switch stores', {
        error: error instanceof Error ? error.message : String(error),
        newStoreId: newStore.store_id,
        newStoreName: newStore.store_name,
      })
      toast.error('Failed to switch stores')
    } finally {
      setChangingStore(false)
    }
  }

  return {
    switchStore,
    isChangingStore: updatePrimaryStoreMutation.isPending,
  }
}

// Hook to get single store details
export function useStore(storeId: string | null) {
  return useQuery({
    queryKey: queryKeys.stores.detail(storeId || ''),
    queryFn: () => {
      return fetchStoreById(storeId!)
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false, // Don't refetch if we have cached data
    refetchOnWindowFocus: false, // Don't refetch on window focus
  })
}
