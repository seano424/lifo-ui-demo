import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries/query-keys'
import {
  fetchUserStores,
  fetchStoreById,
  fetchUserPreferences,
  updateUserPrimaryStore,
  type Store,
} from '@/lib/queries/stores'
import { useStoreState } from '@/lib/stores/store-context'
import { createClient } from '@/lib/supabase/client'

// Hook to get current auth user
function useCurrentAuthUser() {
  console.log('[useCurrentAuthUser] Hook called')

  return useQuery({
    queryKey: ['currentAuthUser'],
    queryFn: async () => {
      console.log('[useCurrentAuthUser] Fetching user from Supabase')
      const supabase = createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      console.log('[useCurrentAuthUser] Auth result - user:', user?.id, 'error:', error)

      if (error || !user) {
        throw new Error('Not authenticated')
      }

      return user
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })
}

// Hook to get user's stores and automatically set active store
export function useUserStores() {
  const { data: currentUser } = useCurrentAuthUser()
  const { setActiveStore, setUserStores, setLoadingStores, activeStore, userStores } =
    useStoreState()

  console.log(
    '[useUserStores] Hook called - currentUser:',
    currentUser?.id,
    'activeStore:',
    activeStore?.store_id,
  )

  const userStoresResult = useQuery({
    queryKey: queryKeys.stores.userStores(currentUser?.id || ''),
    queryFn: () => {
      console.log('[useUserStores] Fetching stores for user:', currentUser!.id)
      return fetchUserStores(currentUser!.id)
    },
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const userPreferencesResult = useQuery({
    queryKey: queryKeys.userPreferences.detail(currentUser?.id || ''),
    queryFn: () => {
      console.log('[useUserStores] Fetching user preferences')
      return fetchUserPreferences()
    },
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Auto-select store when data loads
  useEffect(() => {
    console.log(
      '[useUserStores.useEffect] Checking store selection - stores:',
      userStoresResult.data?.length,
      'activeStore:',
      activeStore?.store_id,
    )

    if (userStoresResult.data && userStoresResult.data.length > 0 && !activeStore) {
      console.log(
        '[useUserStores.useEffect] Setting up stores - found',
        userStoresResult.data.length,
        'stores',
      )
      setLoadingStores(userStoresResult.isLoading)

      // Store the complete UserStore objects (no manual transformation needed!)
      setUserStores(userStoresResult.data)

      // Find primary store from preferences or default to first store
      const primaryStoreId = userPreferencesResult.data?.primary_store_id
      console.log('[useUserStores.useEffect] Primary store from preferences:', primaryStoreId)

      const primaryUserStore = userStoresResult.data.find(
        us => us.store.store_id === primaryStoreId,
      )
      const userStoreToSelect = primaryUserStore || userStoresResult.data[0]

      console.log(
        '[useUserStores.useEffect] Setting active store:',
        userStoreToSelect.store.store_id,
        userStoreToSelect.store.store_name,
      )
      // Set the active store (just the store part, not the UserStore wrapper)
      setActiveStore(userStoreToSelect.store)
    }
  }, [
    userStoresResult.data,
    userPreferencesResult.data,
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
  const queryClient = useQueryClient()
  const { data: currentUser } = useCurrentAuthUser()
  const { setActiveStore, setChangingStore, activeStore } = useStoreState()

  console.log(
    '[useStoreActions] Hook called - currentUser:',
    currentUser?.id,
    'activeStore:',
    activeStore?.store_id,
  )

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
    console.log(
      '[useStoreActions.switchStore] Switching from',
      activeStore?.store_id,
      'to',
      newStore.store_id,
      'makePrimary:',
      makePrimary,
    )

    if (!currentUser || newStore.store_id === activeStore?.store_id) {
      console.log('[useStoreActions.switchStore] Skipping - same store or no user')
      return
    }

    setChangingStore(true)

    try {
      console.log(
        '[useStoreActions.switchStore] Setting new active store:',
        newStore.store_id,
        newStore.store_name,
      )
      // Update active store in state (no manual transformation needed!)
      setActiveStore(newStore)

      // Invalidate all store-specific queries to refetch for new store
      console.log('[useStoreActions.switchStore] Invalidating store-specific queries')
      queryClient.invalidateQueries({
        queryKey: ['products', 'byStore'],
      })
      queryClient.invalidateQueries({
        queryKey: ['batches', 'byStore'],
      })

      // Update primary store if requested
      if (makePrimary) {
        console.log('[useStoreActions.switchStore] Updating primary store preference')
        updatePrimaryStoreMutation.mutate({
          userId: currentUser.id,
          storeId: newStore.store_id,
        })
      }

      toast.success(`Switched to ${newStore.store_name}`)
    } catch (error) {
      console.error('[useStoreActions.switchStore] Error:', error)
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
  console.log('[useStore] Hook called - storeId:', storeId)

  return useQuery({
    queryKey: queryKeys.stores.detail(storeId || ''),
    queryFn: () => {
      console.log('[useStore] Fetching store details for:', storeId)
      return fetchStoreById(storeId!)
    },
    enabled: !!storeId,
  })
}
