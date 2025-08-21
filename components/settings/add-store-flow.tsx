'use client'

import { AlertCircle, ArrowLeftIcon } from 'lucide-react'
import { AddStoreDetailsStep } from '@/components/settings/add-store-details-step'
import { AddStoreSearchStep } from '@/components/settings/add-store-search-step'
import { AddStoreSuccess } from '@/components/settings/add-store-success'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { type StoreFormData, useAddStoreStore } from '@/lib/stores/add-store-store'
import { cn } from '@/lib/utils'

export function AddStoreFlow() {
  const {
    currentStep,
    setCurrentStep,
    isCreating,
    setIsCreating,
    isComplete,
    setIsComplete,
    error,
    setError,
    selectedStoreForm,
  } = useAddStoreStore()

  // Define step labels and determine if a step should be accessible
  const steps = [
    { label: 'Store Search', accessible: true },
    { label: 'Store Details', accessible: currentStep >= 2 },
    { label: 'Complete', accessible: currentStep >= 3 },
  ]

  const canGoBack = currentStep > 1 && !isCreating

  const handleCreateStore = async (storeData: StoreFormData) => {
    if (!storeData.store_type) {
      setError('Please select a store type to continue.')
      return
    }

    setIsCreating(true)
    setError(undefined)

    try {
      // Generate a temporary store code
      const tempStoreCode = `${storeData.store_name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}`

      // Prepare data for API (matching the expected format)
      const storeCreateData = {
        store_name: storeData.store_name,
        store_code: tempStoreCode,
        store_type: storeData.store_type,
        address: storeData.address,
        city: storeData.city,
        country: storeData.country || 'France',
        business_name: storeData.business_name || storeData.store_name,
        postal_code: storeData.postal_code,
        phone: storeData.phone,
        size_category: null, // We don't collect this in our simplified flow
      }

      // Call API to create the store
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storeCreateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create store')
      }

      // Mark as complete and move to success step
      setIsComplete(true)
      setCurrentStep(3)
    } catch (error) {
      console.error('Error creating store:', error)
      setError(error instanceof Error ? error.message : 'Failed to create store. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between text-sm">
          {steps.map((step, index) => {
            const stepNumber = index + 1
            const isCurrentStep = stepNumber === currentStep
            const isCompleted = stepNumber < currentStep || (stepNumber === 3 && isComplete)
            const isAccessible = step.accessible

            return (
              <button
                onClick={() => isAccessible && !isCreating && setCurrentStep(stepNumber)}
                key={step.label}
                disabled={!isAccessible || isCreating}
                className={cn(
                  'text-center transition-colors',
                  isAccessible && !isCreating
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
            style={{ width: `${(Math.min(currentStep, 3) / 3) * 100}%` }}
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

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step content */}
      <div className="min-h-[500px]">
        {currentStep === 1 && <AddStoreSearchStep />}
        {currentStep === 2 && (
          <AddStoreDetailsStep onSubmit={handleCreateStore} isSubmitting={isCreating} />
        )}
        {currentStep === 3 && isComplete && selectedStoreForm && (
          <AddStoreSuccess storeName={selectedStoreForm.store_name} />
        )}
      </div>
    </div>
  )
}
