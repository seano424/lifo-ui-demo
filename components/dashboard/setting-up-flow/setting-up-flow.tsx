import { useEffect } from 'react'
import { SetupStepsProgress } from './setup-steps-progress'
import { AddStoreStep, BatchTrackingStep } from './steps'
import { useSetupFlowStore, type SetupStep } from '@/lib/stores/setup-flow-store'

const STEP_COMPONENTS: Record<SetupStep, React.ComponentType> = {
  'add-store': AddStoreStep,
  'batch-tracking-setup': BatchTrackingStep,
}

export function SettingUpFlow() {
  const { currentStep, setCurrentStep } = useSetupFlowStore()

  // Migration: Handle old step names from localStorage
  useEffect(() => {
    // @ts-expect-error - Handling legacy step names that no longer exist in type
    if (currentStep === 'create-account') {
      setCurrentStep('add-store')
    }
    // @ts-expect-error - Handling legacy step names that no longer exist in type
    if (currentStep === 'integrate-data') {
      setCurrentStep('add-store')
    }
    // @ts-expect-error - Handling legacy step names that no longer exist in type
    if (currentStep === 'setup-notifications') {
      setCurrentStep('batch-tracking-setup')
    }
    // @ts-expect-error - Handling legacy step names that no longer exist in type
    if (currentStep === 'create-first-batch') {
      setCurrentStep('batch-tracking-setup')
    }
  }, [currentStep, setCurrentStep])

  const StepComponent = STEP_COMPONENTS[currentStep]

  // Fallback: If step component is not found, default to first step
  if (!StepComponent) {
    return <AddStoreStep />
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="flex flex-col gap-6 bg-white rounded-xl p-6 select-none">
        <SetupStepsProgress />
        <StepComponent />
      </div>
    </div>
  )
}
