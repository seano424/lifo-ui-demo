import { useEffect } from 'react'
import { SetupStepsSidebar } from './setup-steps-sidebar'
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
    <div className="flex flex-col gap-4 lg:flex-row w-full h-full p-6 lg:p-0">
      {/* Sidebar */}
      <aside className="h-full relative lg:max-w-xs">
        <SetupStepsSidebar />
      </aside>

      {/* Step content */}
      <main className="lg:p-6 w-full">
        <div className="bg-muted/30 dark:bg-muted/10 p-6 rounded-2xl">
          <StepComponent />
        </div>
      </main>
    </div>
  )
}
