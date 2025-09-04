'use client'

import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeftIcon } from 'lucide-react'
import { useEffect } from 'react'
import { AddStoreDetailsStep } from '@/components/settings/add-store-details-step'
import { AddStoreSearchStep } from '@/components/settings/add-store-search-step'
import { AddStoreSuccess } from '@/components/settings/add-store-success'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DEFAULT_STORE_VALUES,
  STORE_FLOW_STEPS,
  STORE_FLOW_STEPS_NO_GOOGLE_PLACES,
} from '@/lib/constants/store-flow'
import { type StoreFormData, useAddStoreStore } from '@/lib/stores/add-store-store'
import { cn } from '@/lib/utils'
import { reportError } from '@/lib/utils/error-reporting'
import { isGooglePlacesEnabled } from '@/lib/utils/google-places-config'
import { generateUniqueStoreCode } from '@/lib/utils/store-utils'

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
    initializeForGooglePlaces,
  } = useAddStoreStore()

  const queryClient = useQueryClient()

  // Check if Google Places is enabled to determine available steps
  const googlePlacesEnabled = isGooglePlacesEnabled()

  // Initialize the store based on Google Places availability
  useEffect(() => {
    initializeForGooglePlaces(googlePlacesEnabled)
  }, [googlePlacesEnabled, initializeForGooglePlaces])

  const canGoBack = currentStep > STORE_FLOW_STEPS.SEARCH && !isCreating && googlePlacesEnabled

  const handleCreateStore = async (storeData: StoreFormData) => {
    if (!storeData.store_type) {
      setError('Please select a store type to continue.')
      return
    }

    setIsCreating(true)
    setError(undefined)

    try {
      // Generate a unique store code
      const tempStoreCode = generateUniqueStoreCode(storeData.store_name)

      // Prepare data for API (matching the expected format)
      const storeCreateData = {
        store_name: storeData.store_name,
        store_code: tempStoreCode,
        store_type: storeData.store_type,
        address: storeData.address,
        city: storeData.city,
        country: storeData.country || DEFAULT_STORE_VALUES.COUNTRY,
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

      // Batch invalidate related queries for better performance
      await queryClient.invalidateQueries({
        predicate: query => {
          const queryKey = query.queryKey
          return (
            queryKey.includes('stores') ||
            queryKey.includes('userPreferences') ||
            queryKey.includes('currentAuthUser')
          )
        },
      })

      // Mark as complete and move to success step
      setIsComplete(true)
      setCurrentStep(
        googlePlacesEnabled ? STORE_FLOW_STEPS.SUCCESS : STORE_FLOW_STEPS_NO_GOOGLE_PLACES.SUCCESS,
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create store. Please try again.'

      // Report error with context
      reportError(error instanceof Error ? error : new Error(errorMessage), {
        context: {
          action: 'createStore',
          storeData: {
            store_name: storeData.store_name,
            store_type: storeData.store_type,
            country: storeData.country,
          },
        },
        storeName: storeData.store_name,
        severity: 'high',
      })

      setError(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {googlePlacesEnabled && (
        <Button
          variant="ghost"
          className={cn('rounded-full border-none h-10 w-10 mb-2', !canGoBack && '!opacity-0')}
          onClick={() => canGoBack && setCurrentStep(currentStep - 1)}
          disabled={!canGoBack}
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step content */}
      <div className="min-h-[500px]">
        {googlePlacesEnabled ? (
          <>
            {currentStep === STORE_FLOW_STEPS.SEARCH && <AddStoreSearchStep />}
            {currentStep === STORE_FLOW_STEPS.DETAILS && (
              <AddStoreDetailsStep onSubmit={handleCreateStore} isSubmitting={isCreating} />
            )}
            {currentStep === STORE_FLOW_STEPS.SUCCESS && isComplete && selectedStoreForm && (
              <AddStoreSuccess storeName={selectedStoreForm.store_name} />
            )}
          </>
        ) : (
          <>
            {currentStep === STORE_FLOW_STEPS_NO_GOOGLE_PLACES.DETAILS && (
              <AddStoreDetailsStep onSubmit={handleCreateStore} isSubmitting={isCreating} />
            )}
            {currentStep === STORE_FLOW_STEPS_NO_GOOGLE_PLACES.SUCCESS &&
              isComplete &&
              selectedStoreForm && <AddStoreSuccess storeName={selectedStoreForm.store_name} />}
          </>
        )}
      </div>
    </div>
  )
}
