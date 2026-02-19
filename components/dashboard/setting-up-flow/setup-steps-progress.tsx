'use client'

import { useSetupFlowStore } from '@/lib/stores/setup-flow-store'
import { useSetupProgress } from '@/lib/hooks/use-setup-progress'

const SUB_STEP_ORDER = ['intro', 'what-to-track', 'how-to-track', 'review', 'activating']

function getProgressPercentage(
  currentMainStep: string,
  currentSubStep: string | null,
  hasStore: boolean,
): number {
  if (currentSubStep === 'activating') return 100

  if (currentMainStep === 'add-store') {
    // Step 1: in progress vs completed
    return hasStore ? 20 : 10
  }

  // batch-tracking-setup sub-steps: intro → what-to-track → how-to-track → review
  const effectiveSubStep = currentSubStep ?? 'intro'
  const subStepIndex = SUB_STEP_ORDER.indexOf(effectiveSubStep)
  const percentages = [30, 50, 70, 90]
  return percentages[Math.min(subStepIndex, percentages.length - 1)]
}

export function SetupStepsProgress() {
  const { currentStep, batchTrackingSubStep } = useSetupFlowStore()
  const { hasStore } = useSetupProgress()

  const percentage = getProgressPercentage(currentStep, batchTrackingSubStep, hasStore)

  return (
    <div className="h-1.5 bg-muted rounded-full w-1/4 mx-auto">
      <div
        className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
