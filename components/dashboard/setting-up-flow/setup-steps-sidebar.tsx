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
    <div className="flex flex-col gap-6 p-6 rounded-2xl bg-muted/30 dark:bg-muted/10 min-w-[280px] h-full lg:min-w-[320px] shadow-xs lg:rounded-none">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Typography variant="h3">{t('setupFlow.sidebar.title')}</Typography>
        <Typography variant="small">{t('setupFlow.sidebar.subtitle')}</Typography>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-2">
        <div className="h-2 bg-gray-200 dark:bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-primary-900 to-primary-800 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <Typography variant="small" className="text-right">
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
                'hover:bg-secondary-100/50 dark:hover:bg-secondary-900/5',
                isCurrent && 'bg-secondary-100/50 dark:bg-secondary-900/5',
                !isCurrent && 'hover:bg-muted',
              )}
            >
              {/* Step icon */}
              <div className="shrink-0">
                {completed ? (
                  <CheckCircle2 className="h-5 w-5 text-primary stroke-2 dark:text-secondary-700" />
                ) : (
                  <Circle
                    className={cn(
                      'h-5 w-5 stroke-2',
                      isCurrent
                        ? 'text-primary fill-primary/20 dark:text-secondary-700 dark:fill-secondary-700/20'
                        : 'text-muted-foreground',
                    )}
                  />
                )}
              </div>

              {/* Step label */}
              <Typography
                variant="p"
                className={cn(
                  '',
                  isCurrent && ' font-heading text-primary-900 dark:text-secondary-700',
                  completed && ' font-heading text-primary-900 dark:text-secondary-700',
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
