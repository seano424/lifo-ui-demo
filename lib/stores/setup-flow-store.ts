import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SetupStep =
  | 'create-account'
  | 'integrate-data'
  | 'create-first-batch'
  | 'setup-notifications'

export const SETUP_STEPS: SetupStep[] = [
  'create-account',
  'integrate-data',
  'create-first-batch',
  'setup-notifications',
]

export interface SetupFlowState {
  currentStep: SetupStep
  completedSteps: SetupStep[]
  isSetupComplete: boolean

  // Actions
  setCurrentStep: (step: SetupStep) => void
  completeStep: (step: SetupStep) => void
  goToNextStep: () => void
  goToPrevStep: () => void
  goToStep: (step: SetupStep) => void
  resetSetup: () => void

  // Helper methods
  isStepCompleted: (step: SetupStep) => boolean
  canAccessStep: (step: SetupStep) => boolean
  getStepIndex: (step: SetupStep) => number
  getProgressPercentage: () => number
}

const initialState = {
  currentStep: 'create-account' as SetupStep,
  completedSteps: ['create-account'] as SetupStep[], // Auto-complete first step
  isSetupComplete: false,
}

export const useSetupFlowStore = create<SetupFlowState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentStep: (step: SetupStep) => {
        set({ currentStep: step })
      },

      completeStep: (step: SetupStep) => {
        const { completedSteps } = get()

        // Don't add duplicates
        if (completedSteps.includes(step)) return

        const newCompletedSteps = [...completedSteps, step]
        const isComplete = newCompletedSteps.length === SETUP_STEPS.length

        set({
          completedSteps: newCompletedSteps,
          isSetupComplete: isComplete,
        })

        // Auto-advance to next step if not complete
        if (!isComplete) {
          const currentIndex = SETUP_STEPS.indexOf(step)
          const nextStep = SETUP_STEPS[currentIndex + 1]
          if (nextStep) {
            set({ currentStep: nextStep })
          }
        }
      },

      goToNextStep: () => {
        const { currentStep } = get()
        const currentIndex = SETUP_STEPS.indexOf(currentStep)
        const nextStep = SETUP_STEPS[currentIndex + 1]

        if (nextStep) {
          set({ currentStep: nextStep })
        }
      },

      goToPrevStep: () => {
        const { currentStep } = get()
        const currentIndex = SETUP_STEPS.indexOf(currentStep)
        const prevStep = SETUP_STEPS[currentIndex - 1]

        if (prevStep) {
          set({ currentStep: prevStep })
        }
      },

      goToStep: (step: SetupStep) => {
        const { canAccessStep } = get()

        if (canAccessStep(step)) {
          set({ currentStep: step })
        }
      },

      resetSetup: () => {
        set(initialState)
      },

      isStepCompleted: (step: SetupStep) => {
        const { completedSteps } = get()
        return completedSteps.includes(step)
      },

      canAccessStep: (step: SetupStep) => {
        const { completedSteps } = get()
        const stepIndex = SETUP_STEPS.indexOf(step)

        // Can access if:
        // 1. Step is already completed
        // 2. Previous step is completed
        if (completedSteps.includes(step)) return true

        const prevStep = SETUP_STEPS[stepIndex - 1]
        return prevStep ? completedSteps.includes(prevStep) : true
      },

      getStepIndex: (step: SetupStep) => {
        return SETUP_STEPS.indexOf(step)
      },

      getProgressPercentage: () => {
        const { completedSteps } = get()
        return Math.round((completedSteps.length / SETUP_STEPS.length) * 100)
      },
    }),
    {
      name: 'lifo-setup-flow',
      partialize: state => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        isSetupComplete: state.isSetupComplete,
      }),
    },
  ),
)
