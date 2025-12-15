import { useEffect } from 'react'
import { SetupStepsSidebar } from './setup-steps-sidebar'
import {
  // CreateAccountStep,
  AddStoreStep,
  CreateBatchStep,
  SetupNotificationsStep,
} from './steps'
import { DashboardWelcome } from '../dashboard-welcome'
import { useSetupFlowStore, type SetupStep } from '@/lib/stores/setup-flow-store'

const STEP_COMPONENTS: Record<SetupStep, React.ComponentType> = {
  'create-account': DashboardWelcome,
  'add-store': AddStoreStep,
  'create-first-batch': CreateBatchStep,
  'setup-notifications': SetupNotificationsStep,
}

export function SettingUpFlow() {
  const { currentStep, setCurrentStep } = useSetupFlowStore()

  // Migration: Handle old 'integrate-data' step name from localStorage
  useEffect(() => {
    // @ts-expect-error - Handling legacy step name that no longer exists in type
    if (currentStep === 'integrate-data') {
      setCurrentStep('add-store')
    }
  }, [currentStep, setCurrentStep])

  const StepComponent = STEP_COMPONENTS[currentStep]

  // Fallback: If step component is not found, default to first step
  if (!StepComponent) {
    return <DashboardWelcome />
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
