import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Store as DatabaseStore, UserStore } from '@/lib/queries/stores'

export type Store = DatabaseStore

interface StoreState {
  activeStore: Store | null

  userStores: UserStore[]

  isLoadingStores: boolean
  isChangingStore: boolean

  setActiveStore: (store: Store) => void
  setUserStores: (userStores: UserStore[]) => void
  setLoadingStores: (loading: boolean) => void
  setChangingStore: (changing: boolean) => void

  getActiveStoreId: () => string | null

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

export const useActiveStoreId = () => {
  return useStoreState(state => state.getActiveStoreId())
}
