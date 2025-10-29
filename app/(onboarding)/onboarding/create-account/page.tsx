import { BackToHomeButton } from '@/components/back-to-home-button'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'

export default function CreateAccountPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-2xl space-y-6">
        <BackToHomeButton className="flex justify-start" />
        <OnboardingFlow />
      </div>
    </div>
  )
}
