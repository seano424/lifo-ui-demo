'use client'

import { useEffect } from 'react'
import { ConfirmDetailsStep } from '@/components/onboarding/confirm-details-step'
import { OnboardingSignUpForm } from '@/components/onboarding/onboarding-signup-form'
import { OnboardingSuccess } from '@/components/onboarding/onboarding-success'
import { StoreSearchStep } from '@/components/onboarding/store-search-step'
import { StoreTypeStep } from '@/components/onboarding/store-type-step'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { cn } from '@/lib/utils'
import { isGooglePlacesEnabled } from '@/lib/utils/google-places-config'
import { Typography } from '../ui/typography'

export function OnboardingFlow() {
  const {
    currentStep,
    setCurrentStep,
    businessCheckResult,
    setManualEntry,
    isEmailSent,
    selectedStoreForm,
  } = useOnboardingStore()

  // Check if Google Places is enabled to determine available steps
  const googlePlacesEnabled = isGooglePlacesEnabled()

  // Initialize manual entry when Google Places is disabled
  useEffect(() => {
    if (!googlePlacesEnabled) {
      setManualEntry(true)
    }
  }, [googlePlacesEnabled, setManualEntry])

  // Define step labels and determine if a step should be accessible based on Google Places availability
  const steps = googlePlacesEnabled
    ? [
        { label: 'Store Lookup', accessible: true },
        { label: 'Add Store Details', accessible: currentStep >= 2 },
        { label: 'Review & Verify', accessible: currentStep >= 3 },
        {
          label: 'Create Account',
          accessible: currentStep >= 4 && !businessCheckResult?.exists,
        },
      ]
    : [
        { label: 'Add Store Details', accessible: true },
        { label: 'Review & Verify', accessible: currentStep >= 2 },
        {
          label: 'Create Account',
          accessible: currentStep >= 3 && !businessCheckResult?.exists,
        },
      ]

  // Show success step when account creation is complete
  const showSuccessStep = isEmailSent && currentStep === (googlePlacesEnabled ? 5 : 4)

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
                width: `${(Math.min(currentStep, steps.length) / steps.length) * 100}%`,
              }}
            />
          </div>
        </>
      )}

      {/* Step content */}
      <div className="min-h-[500px] mt-6">
        {showSuccessStep && selectedStoreForm ? (
          <OnboardingSuccess storeName={selectedStoreForm.store_name} />
        ) : googlePlacesEnabled ? (
          <>
            {currentStep === 1 && <StoreSearchStep />}
            {currentStep === 2 && <StoreTypeStep />}
            {currentStep === 3 && <ConfirmDetailsStep />}
            {currentStep === 4 && <OnboardingSignUpForm />}
          </>
        ) : (
          <>
            {currentStep === 1 && <StoreTypeStep />}
            {currentStep === 2 && <ConfirmDetailsStep />}
            {currentStep === 3 && <OnboardingSignUpForm />}
          </>
        )}
      </div>

      {/* Helper text for business verification */}
      {businessCheckResult?.exists && currentStep >= (googlePlacesEnabled ? 3 : 2) && (
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
