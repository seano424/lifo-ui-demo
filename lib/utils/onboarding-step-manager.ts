/**
 * Clean, centralized onboarding step management
 * No conditionals, easy to track and maintain
 */

import { isGooglePlacesEnabled } from '@/lib/utils/google-places-config'

export const STEP_IDS = {
  STORE_SEARCH: 'store_search',
  STORE_TYPE: 'store_type',
  CONFIRM_DETAILS: 'confirm_details',
  CREATE_ACCOUNT: 'create_account',
  SUCCESS: 'success',
} as const

export type StepId = (typeof STEP_IDS)[keyof typeof STEP_IDS]

export interface Step {
  id: StepId
  labelKey: string
  labelFallback: string
  component: string
  index: number // 1-based index for this configuration
}

export class OnboardingStepManager {
  private steps: Step[]
  private currentIndex: number = 1

  constructor() {
    this.steps = this.initializeSteps()
  }

  private initializeSteps(): Step[] {
    const googlePlacesEnabled = isGooglePlacesEnabled()

    if (googlePlacesEnabled) {
      return [
        {
          id: STEP_IDS.STORE_SEARCH,
          labelKey: 'stepLabels.storeLookup',
          labelFallback: 'Store Lookup',
          component: 'StoreSearchStep',
          index: 1,
        },
        {
          id: STEP_IDS.STORE_TYPE,
          labelKey: 'stepLabels.addStoreDetails',
          labelFallback: 'Add Store Details',
          component: 'StoreTypeStep',
          index: 2,
        },
        {
          id: STEP_IDS.CONFIRM_DETAILS,
          labelKey: 'stepLabels.reviewVerify',
          labelFallback: 'Review & Verify',
          component: 'ConfirmDetailsStep',
          index: 3,
        },
        {
          id: STEP_IDS.CREATE_ACCOUNT,
          labelKey: 'stepLabels.createAccount',
          labelFallback: 'Create Account',
          component: 'OnboardingSignUpForm',
          index: 4,
        },
      ]
    } else {
      return [
        {
          id: STEP_IDS.STORE_TYPE,
          labelKey: 'stepLabels.addStoreDetails',
          labelFallback: 'Add Store Details',
          component: 'StoreTypeStep',
          index: 1,
        },
        {
          id: STEP_IDS.CONFIRM_DETAILS,
          labelKey: 'stepLabels.reviewVerify',
          labelFallback: 'Review & Verify',
          component: 'ConfirmDetailsStep',
          index: 2,
        },
        {
          id: STEP_IDS.CREATE_ACCOUNT,
          labelKey: 'stepLabels.createAccount',
          labelFallback: 'Create Account',
          component: 'OnboardingSignUpForm',
          index: 3,
        },
      ]
    }
  }

  // Public API
  getAllSteps(): Step[] {
    return [...this.steps]
  }

  getCurrentStep(): Step | null {
    return this.steps[this.currentIndex - 1] || null
  }

  getCurrentIndex(): number {
    return this.currentIndex
  }

  setCurrentIndex(index: number): void {
    if (index >= 1 && index <= this.steps.length) {
      this.currentIndex = index
    }
  }

  goToNext(): boolean {
    if (this.currentIndex < this.steps.length) {
      this.currentIndex++
      return true
    }
    return false
  }

  goToPrevious(): boolean {
    if (this.currentIndex > 1) {
      this.currentIndex--
      return true
    }
    return false
  }

  canGoNext(): boolean {
    return this.currentIndex < this.steps.length
  }

  canGoBack(): boolean {
    return this.currentIndex > 1
  }

  getTotalSteps(): number {
    return this.steps.length
  }

  getSuccessStepIndex(): number {
    return this.steps.length + 1
  }

  // Helper to get step by ID
  getStepById(stepId: StepId): Step | null {
    return this.steps.find(step => step.id === stepId) || null
  }

  // Helper to get index by step ID
  getIndexByStepId(stepId: StepId): number | null {
    const step = this.getStepById(stepId)
    return step ? step.index : null
  }

  // Helper to get step accessibility (for progress indicator)
  getStepAccessibility(stepIndex: number, businessExists?: boolean): boolean {
    // Step is accessible if:
    // 1. Current step or earlier
    // 2. Not the CREATE_ACCOUNT step when business already exists
    const step = this.steps[stepIndex - 1]
    if (!step) return false

    const isCurrentOrEarlier = stepIndex <= this.currentIndex
    const isBlockedByBusinessCheck = step.id === STEP_IDS.CREATE_ACCOUNT && businessExists

    return isCurrentOrEarlier && !isBlockedByBusinessCheck
  }
}

// Create singleton instance
export const stepManager = new OnboardingStepManager()
