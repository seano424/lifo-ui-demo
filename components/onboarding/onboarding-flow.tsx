'use client'

import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { StoreSearchStep } from './store-search-step'
import { StoreTypeStep } from './store-type-step'
import { ConfirmDetailsStep } from './confirm-details-step'
import { OnboardingSignUpForm } from './onboarding-signup-form'

export function OnboardingFlow() {
  const { currentStep } = useOnboardingStore()

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between text-sm">
          {['Store', 'Type', 'Confirm', 'Account'].map((label, index) => (
            <div
              key={label}
              className={`text-center ${
                index + 1 <= currentStep ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 mx-auto mb-1 flex items-center justify-center ${
                  index + 1 <= currentStep
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              {label}
            </div>
          ))}
        </div>
        <div className="mt-4 bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[500px] flex items-center justify-center">
        {currentStep === 1 && <StoreSearchStep />}
        {currentStep === 2 && <StoreTypeStep />}
        {currentStep === 3 && <ConfirmDetailsStep />}
        {currentStep === 4 && <OnboardingSignUpForm />}
      </div>
    </div>
  )
}
