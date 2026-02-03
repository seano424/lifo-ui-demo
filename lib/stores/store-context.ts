import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Store as DatabaseStore, UserStore } from '@/lib/queries/stores'

const ACTIVE_STORE_KEY = 'activeStoreId'

export type Store = DatabaseStore

interface StoreState {
  activeStore: Store | null

  userStores: UserStore[]

  isLoadingStores: boolean
  isChangingStore: boolean

  setActiveStore: (store: Store | null) => void
  setUserStores: (userStores: UserStore[]) => void
  setLoadingStores: (loading: boolean) => void
  setChangingStore: (changing: boolean) => void
  clearActiveStore: () => void

  getActiveStoreId: () => string | null

  getStoresOnly: () => Store[]
}

export const useStoreState = create<StoreState>()(
  subscribeWithSelector((set, get) => ({
    activeStore: null,
    userStores: [],
    isLoadingStores: true, // Start as true, will be set to false once stores are loaded
    isChangingStore: false,

    setActiveStore: store => {
      // Persist to localStorage when setting active store
      // Cookie persistence is handled by setActiveStoreCookie server action in useStoreActions
      if (typeof window !== 'undefined') {
        if (store) {
          localStorage.setItem(ACTIVE_STORE_KEY, store.store_id)
        } else {
          localStorage.removeItem(ACTIVE_STORE_KEY)
        }
      }
      set({ activeStore: store })
    },
    setUserStores: userStores => set({ userStores }),
    setLoadingStores: loading => set({ isLoadingStores: loading }),
    setChangingStore: changing => set({ isChangingStore: changing }),
    clearActiveStore: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ACTIVE_STORE_KEY)
      }
      set({ activeStore: null })
    },

    getActiveStoreId: () => get().activeStore?.store_id || null,
    getStoresOnly: () => get().userStores.map(us => us.store),
  })),
)

export const useActiveStoreId = () => {
  return useStoreState(state => state.getActiveStoreId())
}
