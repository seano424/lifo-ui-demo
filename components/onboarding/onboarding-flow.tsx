'use client'

import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { StoreSearchStep } from './store-search-step'
import { StoreTypeStep } from './store-type-step'
import { ConfirmDetailsStep } from './confirm-details-step'
import { OnboardingSignUpForm } from './onboarding-signup-form'
import { Button } from '../ui/button'
import { ArrowLeftIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OnboardingFlow() {
  const { currentStep, setCurrentStep } = useOnboardingStore()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-10 flex justify-end">
        <Button onClick={testOnboardingAPI}>Test Onboarding API</Button>
      </div>
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between text-sm">
          {['Store Lookup', 'Store Details', 'Review', 'Account'].map((label, index) => (
            <button
              onClick={() => setCurrentStep(index + 1)}
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
            </button>
          ))}
        </div>
        <div className="mt-4 bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      </div>

      <Button
        variant="ghost"
        className={cn('rounded-full border-none h-10 w-10 mb-2', currentStep === 1 && '!opacity-0')}
        onClick={() => setCurrentStep(currentStep - 1)}
        disabled={currentStep === 1}
      >
        <ArrowLeftIcon className="w-4 h-4" />
        {/* Back to {currentStep === 2 ? 'Store' : currentStep === 3 ? 'Store Details' : 'Confirm'} */}
      </Button>

      {/* Step content */}
      <div className="min-h-[500px]">
        {currentStep === 1 && <StoreSearchStep />}
        {currentStep === 2 && <StoreTypeStep />}
        {currentStep === 3 && <ConfirmDetailsStep />}
        {currentStep === 4 && <OnboardingSignUpForm />}
      </div>
    </div>
  )
}

const testOnboardingAPI = async () => {
  const testData = {
    userId: 'test-user-id-123',
    store: {
      name: 'Test Bakery',
      address: '123 Test Street',
      city: 'Paris',
      postalCode: '75001',
      country: 'France',
      phone: '01 23 45 67 89',
      type: 'bakery',
      coordinates: { lat: 48.8566, lng: 2.3522 },
      googlePlaceId: 'test-place-id',
    },
    user: {
      email: 'test@testbakery.fr',
      fullName: 'Test Manager',
    },
  }

  const response = await fetch('/api/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData),
  })

  const result = await response.json()
  console.log('API Response:', result)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
