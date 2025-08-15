import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Database } from '@/types/supabase'
import { STORE_TYPES } from '@/lib/schemas/store-schemas'

// Database types
export type StoreInsert = Database['business']['Tables']['stores']['Insert']

// For Google Places API and form data before it becomes a Store record
export type StoreFormData = {
  store_name: string
  address: string | null
  city: string | null
  postal_code: string | null
  country: string | null
  store_type: (typeof STORE_TYPES)[number] | null
  business_name?: string | null
  phone?: string
  // Google Places specific
  coordinates?: {
    lat: number
    lng: number
  }
  googlePlaceId?: string
}

export type AddStoreData = {
  // Step 1: Store lookup
  searchQuery: string
  selectedStoreForm?: StoreFormData
  isManualEntry: boolean

  // Step 2: Confirmed store details (ready for database insert)
  confirmedStoreInsert?: StoreInsert

  // Store creation status
  isCreating: boolean
  isComplete: boolean
  error?: string
}

export type AddStoreStore = AddStoreData & {
  // Actions
  setSearchQuery: (query: string) => void
  setSelectedStoreForm: (store: StoreFormData | undefined) => void
  setManualEntry: (isManual: boolean) => void
  setConfirmedStoreInsert: (store: StoreInsert) => void
  setIsCreating: (creating: boolean) => void
  setIsComplete: (complete: boolean) => void
  setError: (error: string | undefined) => void
  reset: () => void

  // Current step
  currentStep: number
  setCurrentStep: (step: number) => void

  // Helper methods
  convertFormDataToInsert: (formData: StoreFormData, storeCode: string) => StoreInsert
}

const initialState: AddStoreData = {
  searchQuery: '',
  selectedStoreForm: undefined,
  isManualEntry: false,
  confirmedStoreInsert: undefined,
  isCreating: false,
  isComplete: false,
  error: undefined,
}

export const useAddStoreStore = create<AddStoreStore>()(
  devtools(
    set => ({
      ...initialState,
      currentStep: 1,

      setSearchQuery: query => set({ searchQuery: query }),
      setSelectedStoreForm: store => set({ selectedStoreForm: store, isManualEntry: false }),
      setManualEntry: isManual => set({ isManualEntry: isManual }),
      setConfirmedStoreInsert: store => set({ confirmedStoreInsert: store }),
      setIsCreating: creating => set({ isCreating: creating }),
      setIsComplete: complete => set({ isComplete: complete }),
      setError: error => set({ error }),
      setCurrentStep: step => set({ currentStep: step }),
      reset: () => set({ ...initialState, currentStep: 1 }),

      // Helper method to convert form data to database insert format
      convertFormDataToInsert: (formData: StoreFormData, storeCode: string): StoreInsert => ({
        store_name: formData.store_name,
        store_code: storeCode,
        business_name: formData.business_name || formData.store_name,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postal_code,
        country: formData.country || 'France',
        store_type: formData.store_type,
        phone: formData.phone || null,
        timezone: getTimezoneForCountry(formData.country || 'France'),
        is_active: true,
        onboarding_completed: false,
        // owner_id will be set in the API
      }),
    }),
    { name: 'AddStoreStore' },
  ),
)

// Helper function to get timezone based on country
function getTimezoneForCountry(country: string): string {
  const timezoneMap: Record<string, string> = {
    France: 'Europe/Paris',
    Netherlands: 'Europe/Amsterdam',
    Germany: 'Europe/Berlin',
    Spain: 'Europe/Madrid',
    Italy: 'Europe/Rome',
    Belgium: 'Europe/Brussels',
    'United Kingdom': 'Europe/London',
    UK: 'Europe/London',
  }

  return timezoneMap[country] || 'Europe/Paris' // Default to Paris
}
