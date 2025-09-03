'use client'

import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeftIcon } from 'lucide-react'
import { useEffect } from 'react'
import { AddStoreDetailsStep } from '@/components/settings/add-store-details-step'
import { AddStoreSearchStep } from '@/components/settings/add-store-search-step'
import { AddStoreSuccess } from '@/components/settings/add-store-success'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { queryKeys } from '@/lib/queries/query-keys'
import { type StoreFormData, useAddStoreStore } from '@/lib/stores/add-store-store'
import { cn } from '@/lib/utils'
import { isGooglePlacesEnabled } from '@/lib/utils/google-places-config'

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

  const canGoBack = currentStep > 1 && !isCreating && googlePlacesEnabled

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

      // Invalidate queries to refresh store lists and preferences
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stores.all,
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.userPreferences.all,
      })
      await queryClient.invalidateQueries({
        queryKey: ['currentAuthUser'],
      })

      // Mark as complete and move to success step
      setIsComplete(true)
      setCurrentStep(googlePlacesEnabled ? 3 : 2)
    } catch (error) {
      console.error('Error creating store:', error)
      setError(error instanceof Error ? error.message : 'Failed to create store. Please try again.')
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
            {currentStep === 1 && <AddStoreSearchStep />}
            {currentStep === 2 && (
              <AddStoreDetailsStep onSubmit={handleCreateStore} isSubmitting={isCreating} />
            )}
            {currentStep === 3 && isComplete && selectedStoreForm && (
              <AddStoreSuccess storeName={selectedStoreForm.store_name} />
            )}
          </>
        ) : (
          <>
            {currentStep === 1 && (
              <AddStoreDetailsStep onSubmit={handleCreateStore} isSubmitting={isCreating} />
            )}
            {currentStep === 2 && isComplete && selectedStoreForm && (
              <AddStoreSuccess storeName={selectedStoreForm.store_name} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
