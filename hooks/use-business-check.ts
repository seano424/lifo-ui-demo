// hooks/use-business-check.ts

import { useState } from 'react'
import { BusinessCheckResult } from '@/lib/stores/onboarding-store'
import { businessCheckSchema, type BusinessCheckRequest } from '@/lib/schemas/store-schemas'

export function useBusinessCheck() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkBusiness = async (
    checkData: BusinessCheckRequest,
  ): Promise<BusinessCheckResult | null> => {
    setIsLoading(true)
    setError(null)

    console.log('🔍 Starting business check for:', {
      name: checkData.name,
      city: checkData.city,
      country: checkData.country,
    })

    try {
      // Validate the request data
      const validationResult = businessCheckSchema.safeParse(checkData)
      if (!validationResult.success) {
        console.error('❌ Business check validation failed:', validationResult.error.errors)
        throw new Error('Invalid business data provided')
      }

      console.log('✅ Validation passed, making API request...')

      const response = await fetch('/api/business/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationResult.data),
      })

      console.log(`📡 API Response: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ API Error Response:', errorData)
        throw new Error(errorData.error || 'Failed to check business')
      }

      const result: BusinessCheckResult = await response.json()

      // Log the result with appropriate emoji and details
      if (result.exists) {
        console.log('⚠️ Business already exists!', {
          message: result.message,
          storeData: result.storeData
            ? {
                store_name: result.storeData.store_name,
                address: result.storeData.address,
                city: result.storeData.city,
              }
            : null,
        })
      } else {
        console.log('✅ Business check passed - no existing business found', {
          message: result.message,
        })
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('💥 Business check failed:', {
        error: errorMessage,
        originalData: checkData,
      })

      setError(errorMessage)

      // Return a safe default that allows the user to proceed
      const fallbackResult = {
        exists: false,
        message: 'Unable to verify business. You can proceed with registration.',
      }

      console.log('🔄 Returning fallback result:', fallbackResult)

      return fallbackResult
    } finally {
      setIsLoading(false)
      console.log('🏁 Business check completed')
    }
  }

  return {
    checkBusiness,
    isLoading,
    error,
  }
}
