// lib/stores/store-context.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Store as DatabaseStore, UserStore } from '@/lib/queries/stores'

// Use the actual database Store type - no custom interface needed
export type Store = DatabaseStore

interface StoreState {
  // Current active store
  activeStore: Store | null

  // All user stores (including role and permissions)
  userStores: UserStore[]

  // Loading states
  isLoadingStores: boolean
  isChangingStore: boolean

  // Actions
  setActiveStore: (store: Store) => void
  setUserStores: (userStores: UserStore[]) => void
  setLoadingStores: (loading: boolean) => void
  setChangingStore: (changing: boolean) => void

  // Helper to get active store ID for queries
  getActiveStoreId: () => string | null

  // Helper to get just the stores array (without roles)
  getStoresOnly: () => Store[]
}

export const useStoreState = create<StoreState>()(
  subscribeWithSelector((set, get) => ({
    activeStore: null,
    userStores: [],
    isLoadingStores: false,
    isChangingStore: false,

    setActiveStore: store => set({ activeStore: store }),
    setUserStores: userStores => set({ userStores }),
    setLoadingStores: loading => set({ isLoadingStores: loading }),
    setChangingStore: changing => set({ isChangingStore: changing }),

    getActiveStoreId: () => get().activeStore?.store_id || null,
    getStoresOnly: () => get().userStores.map(us => us.store),
  })),
)

// Hook to get active store ID for use in queries
export const useActiveStoreId = () => {
  return useStoreState(state => state.getActiveStoreId())
}
