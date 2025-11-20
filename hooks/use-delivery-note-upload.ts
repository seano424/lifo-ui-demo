import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { OCR_CONFIG, isValidOcrFile } from '@/lib/api/ocr-config'
import { TOAST_DURATIONS } from '@/lib/constants/file-upload'
import { logger } from '@/lib/utils/logger'
import { useBatchUploadBase } from './use-batch-upload-base'
import type { DeliveryScenario } from '@/lib/mock-data/delivery-note-samples'

interface DeliveryNoteUploadResponse {
  success: boolean
  batches_created: number
  store_products_created: number
  processed: number
  skipped: number
  errors: string[]
  total_items: number
  processing_time_ms: number
  duplicates_skipped: Array<{
    sku: string
    product_name: string
    expiry_date: string
    reason: string
  }>
  performance_metrics: {
    items_per_second: number
    duplicate_detection_ms: number
    product_resolution_ms: number
    batch_insertion_ms: number
    database_operations_ms: number
    store_products_linked?: number
    products_created?: number
    database_processing_time_ms?: number
  }
}

export function useDeliveryNoteUpload() {
  const queryClient = useQueryClient()
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Use base hook for shared state management
  const batchUploadBase = useBatchUploadBase({
    itemsPerPage: 10,
  })

  /**
   * Preview delivery note via OCR API
   * Validates file, calls OCR endpoint, sets preview data
   */
  const previewDeliveryNote = async (file: File): Promise<void> => {
    try {
      setIsPreviewLoading(true)
      setPreviewError(null)

      // Validate file
      const validation = isValidOcrFile(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Call OCR API
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(OCR_CONFIG.endpoint, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.details || 'OCR processing failed')
      }

      const result = await response.json()

      // Validate response structure
      if (!result.success || !result.data || !Array.isArray(result.data)) {
        throw new Error('Invalid OCR response format')
      }

      // Set preview data (same structure as CSV upload)
      batchUploadBase.setItems(result.data)

      if (process.env.NODE_ENV === 'development') {
        logger.log('delivery-note-upload', 'OCR preview successful', {
          itemCount: result.data.length,
          processingTime: result.metadata?.processing_time_ms,
          mock: result.metadata?.mock,
        })
      }

      toast.success(`Extracted ${result.data.length} items from delivery note`, {
        description: OCR_CONFIG.isMock
          ? 'Using mock data for development'
          : `Processing time: ${result.metadata?.processing_time_ms}ms`,
        duration: 3000,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to process delivery note'
      setPreviewError(errorMessage)

      if (process.env.NODE_ENV === 'development') {
        logger.error('delivery-note-upload', 'OCR preview failed', { error })
      }

      toast.error('Failed to process delivery note', {
        description: errorMessage,
        duration: TOAST_DURATIONS.ERROR,
      })

      throw error
    } finally {
      setIsPreviewLoading(false)
    }
  }

  /**
   * Load a specific mock scenario (for testing)
   */
  const loadMockScenario = async (scenario: DeliveryScenario): Promise<void> => {
    if (!OCR_CONFIG.isMock) {
      toast.error('Mock scenarios only available in development mode')
      return
    }

    try {
      setIsPreviewLoading(true)
      setPreviewError(null)

      // Create a dummy file for the mock API
      const dummyFile = new File(['mock'], 'mock-delivery-note.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('file', dummyFile)

      // Call with scenario parameter
      const response = await fetch(`${OCR_CONFIG.endpoint}?scenario=${scenario}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to load mock scenario')
      }

      const result = await response.json()
      batchUploadBase.setItems(result.data)

      toast.success(`Loaded ${scenario} scenario (${result.data.length} items)`, {
        duration: 2000,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load mock scenario'
      setPreviewError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  /**
   * Upload mutation - sends validated batch data to backend
   * Same endpoint as CSV upload (/api/delivery-note-upload)
   */
  const mutation = useMutation({
    mutationFn: async ({ storeId }: { storeId: string }): Promise<DeliveryNoteUploadResponse> => {
      const items = batchUploadBase.items

      if (!items || items.length === 0) {
        throw new Error('No items to upload. Please process a delivery note first.')
      }

      // Validate no pricing errors
      if (batchUploadBase.hasValidationErrors) {
        throw new Error('Please fix all validation errors before uploading')
      }

      // Show upload info
      const itemsWithoutDates = items.filter(
        item => !item.Expiry_Date || item.Expiry_Date.trim() === '',
      ).length

      if (itemsWithoutDates > 0) {
        toast.info(`Uploading ${items.length} items`, {
          description: `${itemsWithoutDates} items without dates will create store products only (no batches)`,
          duration: 4000,
        })
      }

      // Send data to backend API
      const response = await fetch('/api/delivery-note-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: storeId,
          items: items,
        }),
      })

      if (!response.ok) {
        const error = await response.json()

        if (process.env.NODE_ENV === 'development') {
          logger.error('delivery-note-upload', 'Upload failed', { error })
        }

        // Handle validation errors
        if (response.status === 422 && error.common_errors) {
          const commonErrors = error.common_errors as string[]
          const uniqueErrors = [
            ...new Set(
              commonErrors.map((err: string) => {
                const match = err.match(/: (.+)$/)
                return match ? match[1] : err
              }),
            ),
          ]
          const errorMessage = `${error.error}: ${uniqueErrors.join(', ')}`
          throw new Error(errorMessage)
        }

        let errorMessage = 'Upload failed'
        if (error.error) {
          errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error)
        } else if (error.message) {
          errorMessage = error.message
        } else if (error.detail) {
          errorMessage =
            typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail)
        } else {
          errorMessage = `Upload failed: ${response.statusText}`
        }

        throw new Error(errorMessage)
      }

      const result = await response.json()
      return result
    },
    onSuccess: async (data, { storeId }) => {
      // Invalidate queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['store-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['store-inventory', storeId] })
      queryClient.invalidateQueries({ queryKey: ['expiring-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['todos', 'urgent-count', storeId] })
      queryClient.invalidateQueries({ queryKey: ['todos', 'summary', storeId] })

      // Cache upload results
      queryClient.setQueryData(['delivery-note-upload-results'], data)

      // Success notification
      const metrics = data.performance_metrics || {}
      const speed = metrics.items_per_second || 0
      const totalTime = data.processing_time_ms || 0

      const batchesCreated = data.batches_created || 0
      const storeProductsCreated = data.store_products_created || 0

      let successTitle = '🚀 Successfully imported items'
      if (batchesCreated > 0 && storeProductsCreated > 0) {
        successTitle = `🚀 Successfully imported ${batchesCreated} batches + ${storeProductsCreated} products`
      } else if (batchesCreated > 0) {
        successTitle = `🚀 Successfully imported ${batchesCreated} batches`
      } else if (storeProductsCreated > 0) {
        successTitle = `🚀 Successfully imported ${storeProductsCreated} products`
      }

      toast.success(successTitle, {
        description:
          data.skipped > 0
            ? `${data.skipped} duplicates auto-skipped • ${speed} items/sec • ${totalTime}ms total`
            : `Ultra-fast processing: ${speed} items/sec • ${totalTime}ms total`,
        duration: TOAST_DURATIONS.SUCCESS,
      })
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        logger.error('delivery-note-upload', 'Upload mutation failed', { error })
      }

      const errorMessage = error?.message || 'Unknown error occurred'
      const errorDescription = errorMessage.includes('constraint')
        ? 'Database validation failed. Please check your pricing values (must be greater than 0).'
        : 'Please check your data and try again'

      toast.error(`Upload failed: ${errorMessage}`, {
        description: errorDescription,
        duration: TOAST_DURATIONS.ERROR,
      })
    },
  })

  return {
    // Preview/OCR functions
    previewDeliveryNote,
    isPreviewLoading,
    previewError,
    loadMockScenario,

    // Upload mutation
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    uploadResult: mutation.data,
    uploadError: mutation.error,

    // State management from base hook
    ...batchUploadBase,

    // Reset everything
    resetPreview: () => {
      batchUploadBase.resetState()
      setPreviewError(null)
      mutation.reset()
    },
  }
}
