'use client'

import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { ConfirmDetailsStep } from '@/components/onboarding/confirm-details-step'
import { OnboardingSignUpForm } from '@/components/onboarding/onboarding-signup-form'
import { OnboardingSuccess } from '@/components/onboarding/onboarding-success'
import { StoreSearchStep } from '@/components/onboarding/store-search-step'
import { StoreTypeStep } from '@/components/onboarding/store-type-step'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { cn } from '@/lib/utils'
import { FORM_CONSTANTS } from '@/lib/utils/form-helpers'
import { stepManager, STEP_IDS } from '@/lib/utils/onboarding-step-manager'
import { Typography } from '../ui/typography'

export function OnboardingFlow() {
  const t = useTranslations('onboarding')

  const { currentStep, goToStep, businessCheckResult, isEmailSent, selectedStoreForm } =
    useOnboardingStore()

  // Get all steps from step manager
  const allSteps = stepManager.getAllSteps()

  // Create step configuration with accessibility
  const steps = useMemo(
    () =>
      allSteps.map(step => ({
        ...step,
        label: t(step.labelKey) || step.labelFallback,
        accessible: stepManager.getStepAccessibility(step.index, businessCheckResult?.exists),
      })),
    [allSteps, t, businessCheckResult?.exists],
  )

  // Show success step when account creation is complete
  const successStepIndex = stepManager.getSuccessStepIndex()
  const showSuccessStep = isEmailSent && currentStep === successStepIndex

  return (
    <div>
      {/* Progress indicator - hide on success */}
      {!showSuccessStep && (
        <>
          <div className="flex justify-between text-sm">
            {steps.map((step, index) => {
              const stepNumber = index + 1
              const isCurrentStep = stepNumber === currentStep
              const isCompleted = stepNumber < currentStep
              const isAccessible = step.accessible

              return (
                <button
                  type="button"
                  onClick={() => isAccessible && goToStep(stepNumber)}
                  key={step.label}
                  disabled={!isAccessible}
                  className={cn(
                    'text-center transition-colors',
                    isAccessible
                      ? 'cursor-pointer hover:text-primary'
                      : 'cursor-not-allowed opacity-50',
                    isCurrentStep || isCompleted
                      ? 'text-primary  dark:text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  <Typography
                    className={cn(
                      'text-sm',
                      isAccessible
                        ? 'cursor-pointer hover:text-primary'
                        : 'cursor-not-allowed opacity-50',
                      isCurrentStep || isCompleted
                        ? 'text-primary dark:text-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </Typography>
                </button>
              )
            })}
          </div>
          <div className="mt-4 bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(Math.min(currentStep, steps.length) / steps.length) * FORM_CONSTANTS.PROGRESS_STEP_MULTIPLIER}%`,
              }}
            />
          </div>
        </>
      )}

      {/* Step content */}
      <div className="mt-6" style={{ minHeight: `${FORM_CONSTANTS.MIN_HEIGHT}px` }}>
        {showSuccessStep && selectedStoreForm ? (
          <ErrorBoundary>
            <OnboardingSuccess storeName={selectedStoreForm.store_name} />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary>
            {(() => {
              // Get the current step - super clean, no conditionals!
              const currentStepConfig = stepManager.getCurrentStep()
              if (!currentStepConfig) return null

              // Simple component mapping based on step ID
              switch (currentStepConfig.id) {
                case STEP_IDS.STORE_SEARCH:
                  return <StoreSearchStep />
                case STEP_IDS.STORE_TYPE:
                  return <StoreTypeStep />
                case STEP_IDS.CONFIRM_DETAILS:
                  return <ConfirmDetailsStep />
                case STEP_IDS.CREATE_ACCOUNT:
                  return <OnboardingSignUpForm />
                default:
                  return null
              }
            })()}
          </ErrorBoundary>
        )}
      </div>

      {/* Helper text for business verification */}
      {businessCheckResult?.exists &&
        currentStep >= (stepManager.getIndexByStepId(STEP_IDS.CONFIRM_DETAILS) || 0) && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Need help with business verification?{' '}
              <a
                href="mailto:support@lifo-app?subject=Business Already Registered"
                className="text-primary hover:underline"
              >
                Contact Support
              </a>
            </p>
          </div>
        )}
    </div>
  )
}
