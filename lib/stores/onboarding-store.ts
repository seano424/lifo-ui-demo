import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type StoreDetails = {
  name: string
  address: string
  city: string
  postalCode: string
  country: string
  phone: string
  type: string
  coordinates?: {
    lat: number
    lng: number
  }
  googlePlaceId?: string
}

export type OnboardingData = {
  // Step 1: Store lookup
  searchQuery: string
  selectedStore?: StoreDetails
  isManualEntry: boolean

  // Step 2: Store type
  storeType: string

  // Step 3: Confirmed store details
  confirmedStore?: StoreDetails

  // Step 4: User signup
  userDetails: {
    email: string
    password: string
  }

  // Step 5: Email confirmation
  isEmailSent: boolean
  isConfirmed: boolean
}

export type OnboardingStore = OnboardingData & {
  // Actions
  setSearchQuery: (query: string) => void
  setSelectedStore: (store: StoreDetails | undefined) => void
  setManualEntry: (isManual: boolean) => void
  setStoreType: (type: string) => void
  setConfirmedStore: (store: StoreDetails) => void
  setUserDetails: (details: { email: string; password: string }) => void
  setEmailSent: (sent: boolean) => void
  setConfirmed: (confirmed: boolean) => void
  reset: () => void

  // Current step
  currentStep: number
  setCurrentStep: (step: number) => void
}

const initialState: OnboardingData = {
  searchQuery: '',
  selectedStore: undefined,
  isManualEntry: false,
  storeType: '',
  confirmedStore: undefined,
  userDetails: {
    email: '',
    password: '',
  },
  isEmailSent: false,
  isConfirmed: false,
}

export const useOnboardingStore = create<OnboardingStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      currentStep: 1,

      setSearchQuery: query => set({ searchQuery: query }),
      setSelectedStore: store => set({ selectedStore: store, isManualEntry: false }),
      setManualEntry: isManual => set({ isManualEntry: isManual }),
      setStoreType: type => set({ storeType: type }),
      setConfirmedStore: store => set({ confirmedStore: store }),
      setUserDetails: details => set({ userDetails: details }),
      setEmailSent: sent => set({ isEmailSent: sent }),
      setConfirmed: confirmed => set({ isConfirmed: confirmed }),
      setCurrentStep: step => set({ currentStep: step }),
      reset: () => set({ ...initialState, currentStep: 1 }),
    }),
    { name: 'OnboardingStore' },
  ),
)
