/**
 * React Query hook for OCR processing with FastAPI backend
 * Provides caching, retry logic, and error handling for OCR operations
 */

import { useMutation, useQuery } from '@tanstack/react-query'
import {
  // checkBackendHealth,
  extractExpiryDate,
  extractTextOnly,
  type OCRError,
  performFullOCRAnalysis,
} from '@/lib/api/ocr-client'
import type { ExpiryDateInfo } from '@/lib/stores/scanning-workflow-store'
import { logger } from '@/lib/utils/logger'

// Query keys for React Query caching
export const ocrQueryKeys = {
  health: () => ['ocr', 'health'] as const,
  expiry: (storeId: string, imageHash?: string) => ['ocr', 'expiry', storeId, imageHash] as const,
  fullAnalysis: (storeId: string, imageHash?: string) =>
    ['ocr', 'full-analysis', storeId, imageHash] as const,
  textOnly: (storeId: string, imageHash?: string) =>
    ['ocr', 'text-only', storeId, imageHash] as const,
}

/**
 * Hook to check FastAPI backend health
 */
// export function useOCRBackendHealth() {
//   return useQuery({
//     queryKey: ocrQueryKeys.health(),
//     queryFn: checkBackendHealth,
//     staleTime: 30 * 1000, // 30 seconds
//     refetchInterval: 60 * 1000, // Check every minute
//   })
// }

/**
 * Hook for expiry date extraction
 */
export function useExpiryDateExtraction() {
  return useMutation<
    ExpiryDateInfo,
    OCRError,
    {
      imageBlob: Blob
      storeId: string
      options?: {
        confidenceThreshold?: number
        maxProcessingTimeMs?: number
      }
    }
  >({
    mutationFn: ({ imageBlob, storeId, options }) => extractExpiryDate(imageBlob, storeId, options),

    retry: (failureCount, error) => {
      // Retry network errors up to 2 times, but not API validation errors
      if (error.type === 'network' && failureCount < 2) {
        return true
      }
      if (error.type === 'timeout' && failureCount < 1) {
        return true
      }
      return false
    },

    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
  })
}

/**
 * Hook for full OCR analysis
 */
export function useFullOCRAnalysis() {
  return useMutation<
    {
      expiryDateInfo: ExpiryDateInfo
      additionalData: {
        barcode?: string
        suggestedName?: string
        manufactureDate?: string
        textBlocks: string[]
        confidenceScores: {
          overall: number
          barcode: number
          expiry: number
        }
      }
    },
    OCRError,
    {
      imageBlob: Blob
      storeId: string
      options?: {
        confidenceThreshold?: number
        maxProcessingTimeMs?: number
      }
    }
  >({
    mutationFn: ({ imageBlob, storeId, options }) =>
      performFullOCRAnalysis(imageBlob, storeId, options),

    retry: (failureCount, error) => {
      // More conservative retry for full analysis due to higher cost
      if (error.type === 'network' && failureCount < 1) {
        return true
      }
      return false
    },

    retryDelay: attemptIndex => Math.min(2000 * 2 ** attemptIndex, 10000),
  })
}

/**
 * Hook for text-only extraction
 */
export function useTextExtraction() {
  return useMutation<
    {
      textBlocks: string[]
      suggestedName?: string
      processingTime: number
    },
    OCRError,
    {
      imageBlob: Blob
      storeId: string
      confidenceThreshold?: number
    }
  >({
    mutationFn: ({ imageBlob, storeId, confidenceThreshold }) =>
      extractTextOnly(imageBlob, storeId, confidenceThreshold),

    retry: (failureCount, error) => {
      if (error.type === 'network' && failureCount < 2) {
        return true
      }
      return false
    },

    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
  })
}

/**
 * Utility hook that provides OCR processing with automatic fallback
 * Falls back to manual entry if OCR fails or backend is unavailable
 */
export function useOCRWithFallback() {
  // const { data: isBackendHealthy } = useOCRBackendHealth()
  const expiryExtraction = useExpiryDateExtraction()
  const fullAnalysis = useFullOCRAnalysis()

  const processExpiryDate = async (
    imageBlob: Blob,
    storeId: string,
    options?: {
      confidenceThreshold?: number
      maxProcessingTimeMs?: number
      useFullAnalysis?: boolean
    },
  ): Promise<{
    success: boolean
    expiryDateInfo?: ExpiryDateInfo
    error?: OCRError
    fallbackToManual: boolean
  }> => {
    logger.log('useOCRWithFallback', 'processExpiryDate called', {
      imageBlobSize: imageBlob.size,
      imageBlobType: imageBlob.type,
      storeId,
      options,
      useFullAnalysis: options?.useFullAnalysis || false,
    })

    // // Check if backend is available
    // if (isBackendHealthy === false) {
    //   return {
    //     success: false,
    //     error: {
    //       message: 'OCR backend is not available',
    //       type: 'network',
    //     },
    //     fallbackToManual: true,
    //   }
    // }

    try {
      if (options?.useFullAnalysis) {
        logger.log('useOCRWithFallback', 'Using full OCR analysis')
        const result = await fullAnalysis.mutateAsync({
          imageBlob,
          storeId,
          options,
        })

        logger.log('useOCRWithFallback', 'Full OCR analysis successful', {
          hasExpiryDateInfo: !!result.expiryDateInfo,
          extractedDate: result.expiryDateInfo?.extractedDate,
          confidence: result.expiryDateInfo?.confidence,
        })

        return {
          success: true,
          expiryDateInfo: result.expiryDateInfo,
          fallbackToManual: false,
        }
      } else {
        logger.log('useOCRWithFallback', 'Using expiry date extraction')
        const expiryDateInfo = await expiryExtraction.mutateAsync({
          imageBlob,
          storeId,
          options,
        })

        logger.log('useOCRWithFallback', 'Expiry date extraction successful', {
          extractedDate: expiryDateInfo?.extractedDate,
          confidence: expiryDateInfo?.confidence,
          processingTime: expiryDateInfo?.processingTime,
        })

        return {
          success: true,
          expiryDateInfo,
          fallbackToManual: false,
        }
      }
    } catch (error) {
      const ocrError = error as OCRError

      logger.error('useOCRWithFallback', 'OCR processing failed', {
        errorMessage: ocrError.message,
        errorType: ocrError.type,
        errorDetails: ocrError.details,
      })

      // Determine if we should fallback to manual entry
      // For rate limits, we should NOT fallback - just fail and let auto-scanner handle it
      const shouldFallback =
        ocrError.type === 'network' ||
        ocrError.type === 'timeout' ||
        (ocrError.type === 'api' && ocrError.message.includes('processing failed'))

      logger.log('useOCRWithFallback', 'Fallback decision', {
        shouldFallback,
        errorType: ocrError.type,
        isRateLimit: ocrError.type === 'rate_limit',
      })

      return {
        success: false,
        error: ocrError,
        fallbackToManual: shouldFallback,
      }
    }
  }

  return {
    processExpiryDate,
    // isBackendHealthy,
    isLoading: expiryExtraction.isPending || fullAnalysis.isPending,
    // Expose individual hooks for advanced usage
    expiryExtraction,
    fullAnalysis,
  }
}

/**
 * Helper function to generate a simple hash from image blob for caching
 */
export async function generateImageHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex.substring(0, 16) // Use first 16 chars for brevity
}

/**
 * Hook for cached OCR results (useful for re-processing same image)
 */
export function useCachedOCRResult(imageBlob: Blob | null, storeId: string, enabled = true) {
  return useQuery({
    queryKey: ocrQueryKeys.expiry(storeId, imageBlob ? 'cached' : undefined),
    queryFn: async () => {
      if (!imageBlob) throw new Error('No image provided')

      const imageHash = await generateImageHash(imageBlob)
      // Check if we have a cached result
      const cacheKey = `ocr-result-${storeId}-${imageHash}`
      const cached = localStorage.getItem(cacheKey)

      if (cached) {
        return JSON.parse(cached) as ExpiryDateInfo
      }

      // If not cached, perform extraction and cache result
      const result = await extractExpiryDate(imageBlob, storeId)
      localStorage.setItem(cacheKey, JSON.stringify(result))

      return result
    },
    enabled: enabled && !!imageBlob && !!storeId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}
