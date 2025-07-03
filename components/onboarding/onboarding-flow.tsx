'use client'

import { cn } from '@/lib/utils'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { StoreSearchStep } from '@/components/onboarding/store-search-step'
import { StoreTypeStep } from '@/components/onboarding/store-type-step'
import { ConfirmDetailsStep } from '@/components/onboarding/confirm-details-step'
import { OnboardingSignUpForm } from '@/components/onboarding/onboarding-signup-form'

export function OnboardingFlow() {
  const { currentStep, setCurrentStep, businessCheckResult } = useOnboardingStore()

  // Define step labels and determine if a step should be accessible
  const steps = [
    { label: 'Store Lookup', accessible: true },
    { label: 'Store Details', accessible: currentStep >= 2 },
    { label: 'Review & Verify', accessible: currentStep >= 3 },
    { label: 'Create Account', accessible: currentStep >= 4 && !businessCheckResult?.exists },
  ]

  const canGoBack = currentStep > 1

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between text-sm">
          {steps.map((step, index) => {
            const stepNumber = index + 1
            const isCurrentStep = stepNumber === currentStep
            const isCompleted = stepNumber < currentStep
            const isAccessible = step.accessible

            return (
              <button
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
                <div
                  className={cn(
                    'w-8 h-8 rounded-full border-2 mx-auto mb-1 flex items-center justify-center transition-colors',
                    isCurrentStep || isCompleted
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isAccessible
                        ? 'border-muted-foreground hover:border-primary'
                        : 'border-muted-foreground/50',
                  )}
                >
                  {stepNumber}
                </div>
                <div className="text-xs">{step.label}</div>
              </button>
            )
          })}
        </div>
        <div className="mt-4 bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(Math.min(currentStep, 4) / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Back button */}
      <Button
        variant="ghost"
        className={cn('rounded-full border-none h-10 w-10 mb-2', !canGoBack && '!opacity-0')}
        onClick={() => canGoBack && setCurrentStep(currentStep - 1)}
        disabled={!canGoBack}
      >
        <ArrowLeftIcon className="w-4 h-4" />
      </Button>

      {/* Step content */}
      <div className="min-h-[500px]">
        {currentStep === 1 && <StoreSearchStep />}
        {currentStep === 2 && <StoreTypeStep />}
        {currentStep === 3 && <ConfirmDetailsStep />}
        {currentStep === 4 && <OnboardingSignUpForm />}
      </div>

      {/* Helper text for business verification */}
      {businessCheckResult?.exists && currentStep >= 3 && (
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
