'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo } from 'react'
import { ConfirmDetailsStep } from '@/components/onboarding/confirm-details-step'
import { OnboardingSignUpForm } from '@/components/onboarding/onboarding-signup-form'
import { OnboardingSuccess } from '@/components/onboarding/onboarding-success'
import { StoreSearchStep } from '@/components/onboarding/store-search-step'
import { StoreTypeStep } from '@/components/onboarding/store-type-step'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { cn } from '@/lib/utils'
import { FORM_CONSTANTS } from '@/lib/utils/form-helpers'
import { isGooglePlacesEnabled } from '@/lib/utils/google-places-config'
import {
  getAvailableSteps,
  getSuccessStepIndex,
  STEP_IDS,
  setOnboardingTranslations,
} from '@/lib/utils/onboarding-steps'
import { Typography } from '../ui/typography'

export function OnboardingFlow() {
  const t = useTranslations('onboarding')

  const {
    currentStep,
    setCurrentStep,
    businessCheckResult,
    setManualEntry,
    isEmailSent,
    selectedStoreForm,
  } = useOnboardingStore()

  // Memoize Google Places status to avoid recalculation on every render
  const googlePlacesEnabled = useMemo(() => isGooglePlacesEnabled(), [])

  // Set up translations for onboarding steps
  useEffect(() => {
    setOnboardingTranslations((key: string) => t(key))
  }, [t])

  // Get available steps based on Google Places availability
  const availableSteps = useMemo(
    () => getAvailableSteps(googlePlacesEnabled, (key: string) => t(key)),
    [googlePlacesEnabled, t], // Include translation function as dependency
  )

  // Initialize manual entry when Google Places is disabled
  useEffect(() => {
    if (!googlePlacesEnabled) {
      setManualEntry(true)
    }
  }, [googlePlacesEnabled, setManualEntry])

  // Create step configuration with accessibility
  const steps = useMemo(
    () =>
      availableSteps.map((step, index) => ({
        ...step,
        accessible:
          index + 1 <= currentStep &&
          (step.id !== STEP_IDS.CREATE_ACCOUNT || !businessCheckResult?.exists),
      })),
    [availableSteps, currentStep, businessCheckResult?.exists],
  )

  // Show success step when account creation is complete
  const successStepIndex = getSuccessStepIndex(googlePlacesEnabled, (key: string) => t(key))
  const showSuccessStep = isEmailSent && currentStep === successStepIndex

  return (
    <div className="max-w-2xl mx-auto">
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
                  onClick={() => isAccessible && setCurrentStep(stepNumber)}
                  key={step.label}
                  disabled={!isAccessible}
                  className={cn(
                    'text-center transition-colors',
                    isAccessible
                      ? 'cursor-pointer hover:text-primary'
                      : 'cursor-not-allowed opacity-50',
                    isCurrentStep || isCompleted
                      ? 'text-primary font-medium dark:text-gray-300'
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
                        ? 'text-primary dark:text-gray-300'
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
            {googlePlacesEnabled && currentStep === 1 && <StoreSearchStep />}
            {googlePlacesEnabled && currentStep === 2 && <StoreTypeStep />}
            {googlePlacesEnabled && currentStep === 3 && <ConfirmDetailsStep />}
            {googlePlacesEnabled && currentStep === 4 && <OnboardingSignUpForm />}
            {!googlePlacesEnabled && currentStep === 1 && <StoreTypeStep />}
            {!googlePlacesEnabled && currentStep === 2 && <ConfirmDetailsStep />}
            {!googlePlacesEnabled && currentStep === 3 && <OnboardingSignUpForm />}
          </ErrorBoundary>
        )}
      </div>

      {/* Helper text for business verification */}
      {businessCheckResult?.exists &&
        currentStep >= availableSteps.findIndex(s => s.id === STEP_IDS.CONFIRM_DETAILS) + 1 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Need help with business verification?{' '}
              <a
                href="mailto:support@lifo.ai?subject=Business Already Registered"
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
