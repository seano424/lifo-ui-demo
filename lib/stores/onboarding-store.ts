import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { STORE_TYPES } from '@/lib/schemas/store-schemas'
import { stepManager, STEP_IDS, type StepId } from '@/lib/utils/onboarding-step-manager'
import type { Database } from '@/types/supabase'

// Database types
export type Store = Database['business']['Tables']['stores']['Row']
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

export type BusinessCheckResult = {
  exists: boolean
  storeData?: Store
  message?: string
}

export type OnboardingData = {
  // Step 1: Store lookup
  searchQuery: string
  selectedStoreForm?: StoreFormData
  isManualEntry: boolean

  // Business checking
  businessCheckResult?: BusinessCheckResult
  isCheckingBusiness: boolean

  // Step 3: Confirmed store details (ready for database insert)
  confirmedStoreInsert?: StoreInsert

  // Step 4: User signup
  userDetails: {
    email: string
    password: string
    fullName?: string
  }

  // Step 5: Email confirmation
  isEmailSent: boolean
  isConfirmed: boolean
}

export type OnboardingStore = OnboardingData & {
  // Actions
  setSearchQuery: (query: string) => void
  setSelectedStoreForm: (store: StoreFormData | undefined) => void
  setManualEntry: (isManual: boolean) => void
  setConfirmedStoreInsert: (store: StoreInsert) => void
  setUserDetails: (details: { email: string; password: string; fullName?: string }) => void
  setEmailSent: (sent: boolean) => void
  setConfirmed: (confirmed: boolean) => void
  setBusinessCheckResult: (result: BusinessCheckResult) => void
  setIsCheckingBusiness: (checking: boolean) => void
  reset: () => void

  // Clean step management - reactive with Zustand
  currentStep: number
  getCurrentStepId: () => StepId
  setCurrentStep: (step: number) => void
  goToStep: (stepIndex: number) => void
  goToNextStep: () => boolean
  goToPreviousStep: () => boolean
  canGoNext: () => boolean
  canGoBack: () => boolean

  // Helper methods
  convertFormDataToInsert: (formData: StoreFormData, storeCode: string) => StoreInsert
}

const initialState: OnboardingData = {
  searchQuery: '',
  selectedStoreForm: undefined,
  isManualEntry: false,
  businessCheckResult: undefined,
  isCheckingBusiness: false,
  confirmedStoreInsert: undefined,
  userDetails: {
    email: '',
    password: '',
    fullName: '',
  },
  isEmailSent: false,
  isConfirmed: false,
}

export const useOnboardingStore = create<OnboardingStore>()(
  devtools(
    set => ({
      ...initialState,
      currentStep: 1, // Start at step 1

      setSearchQuery: query => set({ searchQuery: query }),
      setSelectedStoreForm: store => set({ selectedStoreForm: store, isManualEntry: false }),
      setManualEntry: isManual => set({ isManualEntry: isManual }),
      setConfirmedStoreInsert: store => set({ confirmedStoreInsert: store }),
      setUserDetails: details => set({ userDetails: details }),
      setEmailSent: sent => set({ isEmailSent: sent }),
      setConfirmed: confirmed => set({ isConfirmed: confirmed }),
      setBusinessCheckResult: result => set({ businessCheckResult: result }),
      setIsCheckingBusiness: checking => set({ isCheckingBusiness: checking }),

      // Clean step management - reactive with Zustand
      getCurrentStepId: () => stepManager.getCurrentStep()?.id || STEP_IDS.STORE_TYPE,

      setCurrentStep: (step: number) => {
        stepManager.setCurrentIndex(step)
        set({ currentStep: step })
      },

      goToStep: (stepIndex: number) => {
        stepManager.setCurrentIndex(stepIndex)
        set({ currentStep: stepIndex })
      },

      goToNextStep: () => {
        const success = stepManager.goToNext()
        if (success) {
          set({ currentStep: stepManager.getCurrentIndex() })
        }
        return success
      },

      goToPreviousStep: () => {
        const success = stepManager.goToPrevious()
        if (success) {
          set({ currentStep: stepManager.getCurrentIndex() })
        }
        return success
      },

      canGoNext: () => stepManager.canGoNext(),
      canGoBack: () => stepManager.canGoBack(),

      reset: () => {
        stepManager.setCurrentIndex(1)
        set({ ...initialState, currentStep: 1 })
      },

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
        timezone: getTimezoneForCountry(formData.country || 'France'),
        is_active: true,
        onboarding_completed: false,
        // owner_id will be set in the API
      }),
    }),
    { name: 'OnboardingStore' },
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
