/**
 * Onboarding step configuration and navigation utilities
 */

// Translation function type - will be set by components using the utilities
type TranslationFunction = (key: string) => string
let translateFunction: TranslationFunction | null = null

// Function to set the translation function from components
export const setOnboardingTranslations = (t: TranslationFunction) => {
  translateFunction = t
}

export const STEP_IDS = {
  STORE_SEARCH: 'store_search',
  STORE_TYPE: 'store_type',
  CONFIRM_DETAILS: 'confirm_details',
  CREATE_ACCOUNT: 'create_account',
  SUCCESS: 'success',
} as const

export type StepId = (typeof STEP_IDS)[keyof typeof STEP_IDS]

export interface StepConfig {
  id: StepId
  labelKey: string
  labelFallback: string
  component: string
  requiresGooglePlaces: boolean
}

export interface StepConfigWithLabel {
  id: StepId
  label: string
  component: string
  requiresGooglePlaces: boolean
}

export const ALL_STEPS: StepConfig[] = [
  {
    id: STEP_IDS.STORE_SEARCH,
    labelKey: 'stepLabels.storeLookup',
    labelFallback: 'Store Lookup',
    component: 'StoreSearchStep',
    requiresGooglePlaces: true,
  },
  {
    id: STEP_IDS.STORE_TYPE,
    labelKey: 'stepLabels.addStoreDetails',
    labelFallback: 'Add Store Details',
    component: 'StoreTypeStep',
    requiresGooglePlaces: false,
  },
  {
    id: STEP_IDS.CONFIRM_DETAILS,
    labelKey: 'stepLabels.reviewVerify',
    labelFallback: 'Review & Verify',
    component: 'ConfirmDetailsStep',
    requiresGooglePlaces: false,
  },
  {
    id: STEP_IDS.CREATE_ACCOUNT,
    labelKey: 'stepLabels.createAccount',
    labelFallback: 'Create Account',
    component: 'OnboardingSignUpForm',
    requiresGooglePlaces: false,
  },
]

/**
 * Convert step configs to include translated labels
 */
function getStepsWithLabels(steps: StepConfig[]): StepConfigWithLabel[] {
  return steps.map(step => ({
    ...step,
    label: translateFunction ? translateFunction(step.labelKey) : step.labelFallback,
  }))
}

/**
 * Get the available steps based on Google Places availability
 */
export function getAvailableSteps(isGooglePlacesEnabled: boolean): StepConfigWithLabel[] {
  const filteredSteps = ALL_STEPS.filter(
    step => !step.requiresGooglePlaces || isGooglePlacesEnabled,
  )
  return getStepsWithLabels(filteredSteps)
}

/**
 * Get step configuration by ID
 */
export function getStepById(stepId: StepId): StepConfigWithLabel | undefined {
  const step = ALL_STEPS.find(step => step.id === stepId)
  if (!step) return undefined
  return getStepsWithLabels([step])[0]
}

/**
 * Convert step index to step ID for a given configuration
 */
export function getStepIdByIndex(
  index: number,
  isGooglePlacesEnabled: boolean,
): StepId | undefined {
  const availableSteps = getAvailableSteps(isGooglePlacesEnabled)
  return availableSteps[index - 1]?.id
}

/**
 * Convert step ID to step index for a given configuration
 */
export function getStepIndexById(stepId: StepId, isGooglePlacesEnabled: boolean): number {
  const availableSteps = getAvailableSteps(isGooglePlacesEnabled)
  const index = availableSteps.findIndex(step => step.id === stepId)
  return index + 1 // Convert to 1-based indexing
}

/**
 * Get the next step ID
 */
export function getNextStepId(
  currentStepId: StepId,
  isGooglePlacesEnabled: boolean,
): StepId | undefined {
  const availableSteps = getAvailableSteps(isGooglePlacesEnabled)
  const currentIndex = availableSteps.findIndex(step => step.id === currentStepId)

  if (currentIndex === -1 || currentIndex === availableSteps.length - 1) {
    return undefined
  }

  return availableSteps[currentIndex + 1].id
}

/**
 * Get the previous step ID
 */
export function getPreviousStepId(
  currentStepId: StepId,
  isGooglePlacesEnabled: boolean,
): StepId | undefined {
  const availableSteps = getAvailableSteps(isGooglePlacesEnabled)
  const currentIndex = availableSteps.findIndex(step => step.id === currentStepId)

  if (currentIndex === -1 || currentIndex === 0) {
    return undefined
  }

  return availableSteps[currentIndex - 1].id
}

/**
 * Get the success step index (total steps + 1)
 */
export function getSuccessStepIndex(isGooglePlacesEnabled: boolean): number {
  return getAvailableSteps(isGooglePlacesEnabled).length + 1
}
