import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SetupStep = 'add-store' | 'batch-tracking-setup'

export const SETUP_STEPS: SetupStep[] = ['add-store', 'batch-tracking-setup']

export interface SetupFlowState {
  currentStep: SetupStep

  // Actions
  setCurrentStep: (step: SetupStep) => void
  goToNextStep: () => void
  goToPrevStep: () => void
  goToStep: (step: SetupStep) => void
  resetSetup: () => void

  // Helper methods
  getStepIndex: (step: SetupStep) => number
}

const initialState = {
  currentStep: 'add-store' as SetupStep,
}

export const useSetupFlowStore = create<SetupFlowState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentStep: (step: SetupStep) => {
        set({ currentStep: step })
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
        set({ currentStep: step })
      },

      resetSetup: () => {
        set(initialState)
      },

      getStepIndex: (step: SetupStep) => {
        return SETUP_STEPS.indexOf(step)
      },
    }),
    {
      name: 'lifo-setup-flow',
      partialize: state => ({
        currentStep: state.currentStep,
      }),
    },
  ),
)
