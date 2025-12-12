import { SetupStepsSidebar } from './setup-steps-sidebar'
import {
  // CreateAccountStep,
  IntegrateDataStep,
  CreateBatchStep,
  SetupNotificationsStep,
} from './steps'
import { DashboardWelcome } from '../dashboard-welcome'
import { useSetupFlowStore, type SetupStep } from '@/lib/stores/setup-flow-store'

const STEP_COMPONENTS: Record<SetupStep, React.ComponentType> = {
  'create-account': DashboardWelcome,
  'integrate-data': IntegrateDataStep,
  'create-first-batch': CreateBatchStep,
  'setup-notifications': SetupNotificationsStep,
}

export function SettingUpFlow() {
  const { currentStep } = useSetupFlowStore()

  const StepComponent = STEP_COMPONENTS[currentStep]

  return (
    <div className="flex flex-col lg:flex-row w-full h-full">
      {/* Sidebar */}
      <aside className="h-full relative p-6 lg:p-0 lg:max-w-xs">
        <SetupStepsSidebar />
      </aside>

      {/* Step content */}
      <main className="p-6">
        <div className="bg-muted/30 dark:bg-muted/10 p-6 rounded-2xl">
          <StepComponent />
        </div>
      </main>
    </div>
  )
}
