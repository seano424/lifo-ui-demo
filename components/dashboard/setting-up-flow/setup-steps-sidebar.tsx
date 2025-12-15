'use client'

import { Typography } from '@/components/ui/typography'
import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSetupFlowStore, type SetupStep, SETUP_STEPS } from '@/lib/stores/setup-flow-store'
import { useTranslations } from 'next-intl'
import {
  useSetupProgress,
  isStepCompleted,
  getProgressPercentage,
} from '@/lib/hooks/use-setup-progress'

const STEP_LABELS: Record<SetupStep, string> = {
  'create-account': 'setupFlow.sidebar.steps.createAccount',
  'add-store': 'setupFlow.sidebar.steps.addStore',
  'create-first-batch': 'setupFlow.sidebar.steps.createBatch',
}

export function SetupStepsSidebar() {
  const t = useTranslations()
  const { currentStep, goToStep } = useSetupFlowStore()

  // Derive setup progress from database state
  const progress = useSetupProgress()
  const progressPercentage = getProgressPercentage(progress)

  return (
    <div className="flex flex-col gap-6 p-6 rounded-2xl bg-muted/30 dark:bg-muted/10 min-w-[280px] h-full lg:min-w-[320px] shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Typography variant="h3" className="font-semibold">
          {t('setupFlow.sidebar.title')}
        </Typography>
        <Typography variant="p" className="text-sm text-muted-foreground">
          {t('setupFlow.sidebar.subtitle')}
        </Typography>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-2">
        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-purple-600 to-indigo-600 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <Typography variant="p" className="text-xs text-muted-foreground text-right">
          {progressPercentage}% {t('setupFlow.sidebar.complete')}
        </Typography>
      </div>

      {/* Steps list */}
      <div className="flex flex-col gap-2">
        {SETUP_STEPS.map(step => {
          const completed = isStepCompleted(step, progress)
          const isCurrent = currentStep === step

          return (
            <button
              key={step}
              type="button"
              onClick={() => goToStep(step)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl transition-all text-left',
                'hover:bg-secondary-100/50',
                isCurrent && 'bg-secondary-100/50',
                !isCurrent && 'hover:bg-muted',
              )}
            >
              {/* Step icon */}
              <div className="flex-shrink-0">
                {completed ? (
                  <CheckCircle2 className="h-5 w-5 text-primary stroke-2" />
                ) : (
                  <Circle
                    className={cn(
                      'h-5 w-5 stroke-2',
                      isCurrent ? 'text-primary fill-primary/20' : 'text-muted-foreground',
                    )}
                  />
                )}
              </div>

              {/* Step label */}
              <Typography
                variant="p"
                className={cn(
                  'font-medium',
                  isCurrent && 'text-secondary-900',
                  completed && 'text-secondary-900',
                )}
              >
                {t(STEP_LABELS[step])}
              </Typography>
            </button>
          )
        })}
      </div>
    </div>
  )
}
