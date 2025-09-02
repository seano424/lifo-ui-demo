// hooks/use-business-check.ts

import { useState } from 'react'
import { type BusinessCheckRequest, businessCheckSchema } from '@/lib/schemas/store-schemas'
import type { BusinessCheckResult } from '@/lib/stores/onboarding-store'

export function useBusinessCheck() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkBusiness = async (
    checkData: BusinessCheckRequest,
  ): Promise<BusinessCheckResult | null> => {
    setIsLoading(true)
    setError(null)

    try {
      // Validate the request data
      const validationResult = businessCheckSchema.safeParse(checkData)
      if (!validationResult.success) {
        console.error('❌ Business check validation failed:', validationResult.error.errors)
        throw new Error('Invalid business data provided')
      }

      const response = await fetch('/api/business/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationResult.data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ API Error Response:', errorData)
        throw new Error(errorData.error || 'Failed to check business')
      }

      const result: BusinessCheckResult = await response.json()

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

      return fallbackResult
    } finally {
      setIsLoading(false)
    }
  }

  return {
    checkBusiness,
    isLoading,
    error,
  }
}
