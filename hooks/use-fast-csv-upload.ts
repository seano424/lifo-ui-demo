import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface FastUploadResult {
  success: boolean
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
    database_operations_ms: number
  }
}

interface CsvPreviewItem {
  SKU: string
  Product_Name: string
  Category: string
  Quantity: number
  Expiry_Date: string
}

export function useFastCsvUpload() {
  const [csvPreview, setCsvPreview] = useState<CsvPreviewItem[]>([])
  const [isPreviewReady, setIsPreviewReady] = useState(false)
  const queryClient = useQueryClient()

  // Simple CSV preview (first 10 rows)
  const previewCsvFile = async (file: File): Promise<CsvPreviewItem[]> => {
    const text = await file.text()
    const lines = text.trim().split('\n')

    if (lines.length < 2) {
      throw new Error('CSV must have at least a header and one data row')
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const preview: CsvPreviewItem[] = []

    // Simple header detection
    const getColumn = (patterns: string[]) =>
      headers.findIndex(h => patterns.some(p => h.toLowerCase().includes(p.toLowerCase())))

    const skuCol = getColumn(['sku', 'code'])
    const nameCol = getColumn(['name', 'product'])
    const qtyCol = getColumn(['quantity', 'qty'])
    const expiryCol = getColumn(['expiry', 'exp_date'])
    const categoryCol = getColumn(['category', 'type'])

    // Preview first 10 data rows
    for (let i = 1; i <= Math.min(11, lines.length - 1); i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))

        preview.push({
          SKU: values[skuCol] || `AUTO-${i}`,
          Product_Name: values[nameCol] || 'Unknown Product',
          Category: values[categoryCol] || 'dry_goods',
          Quantity: parseInt(values[qtyCol] || '1', 10) || 1,
          Expiry_Date: values[expiryCol] || '',
        })
      } catch (error) {
        console.warn(`Preview row ${i} error:`, error)
      }
    }

    return preview
  }

  // Ultra-fast upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, storeId }: { file: File; storeId: string }) => {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('storeId', storeId)

        const response = await fetch('/api/inventory/upload-fast-skip', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: `Server error: ${response.status}` }))
          throw new Error(errorData.error || `Upload failed with status ${response.status}`)
        }

        const result = await response.json()

        // Validate the response structure
        if (!result || typeof result !== 'object') {
          throw new Error('Invalid response from server')
        }

        return result as FastUploadResult
      } catch (error) {
        // Re-throw with better error context
        if (error instanceof Error) {
          throw new Error(`Upload failed: ${error.message}`)
        }
        throw new Error('Upload failed: Unknown error occurred')
      }
    },
    onSuccess: data => {
      try {
        // Invalidate inventory queries
        queryClient.invalidateQueries({ queryKey: ['inventory'] })
        queryClient.invalidateQueries({ queryKey: ['batches'] })
        queryClient.invalidateQueries({ queryKey: ['store-analytics'] })

        // Safely extract data with fallbacks
        const processed = data?.processed || 0
        const skipped = data?.skipped || 0
        const processingTime = data?.processing_time_ms || 0
        const itemsPerSecond = data?.performance_metrics?.items_per_second || 0

        // Show detailed success message with safe data
        const skippedMessage = skipped > 0 ? `\n${skipped} duplicates skipped` : ''
        const speedMessage = itemsPerSecond > 0 ? `\n⚡ ${itemsPerSecond} items/second` : ''

        toast.success(
          `Upload Complete! 🚀\n${processed} items processed in ${processingTime}ms${skippedMessage}${speedMessage}`,
          { duration: 5000 },
        )

        // Log performance details for debugging (safely)
        console.log('🚀 Upload Performance Metrics:', {
          'Total Time': `${processingTime}ms`,
          'Items/Second': itemsPerSecond,
          'Duplicate Detection': `${data?.performance_metrics?.duplicate_detection_ms || 0}ms`,
          'Database Operations': `${data?.performance_metrics?.database_operations_ms || 0}ms`,
          'Items Processed': processed,
          'Items Skipped': skipped,
          Duplicates: data?.duplicates_skipped || [],
        })

        // Reset preview after successful upload
        setCsvPreview([])
        setIsPreviewReady(false)
      } catch (error) {
        console.error('Error in upload success handler:', error)
        // Still show a basic success message even if metrics fail
        toast.success('Upload completed successfully! Check the results below.', { duration: 3000 })
      }
    },
    onError: error => {
      console.error('Fast upload error:', error)

      // Extract a user-friendly error message
      let userMessage = 'Upload failed due to an unexpected error'

      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          userMessage = 'You are not authorized to upload to this store'
        } else if (error.message.includes('Invalid file type')) {
          userMessage = 'Please upload a valid CSV file'
        } else if (error.message.includes('No valid data')) {
          userMessage = 'The CSV file contains no valid data'
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          userMessage = 'Network error - please check your connection and try again'
        } else {
          userMessage = error.message.replace(/^Upload failed: /, '')
        }
      }

      toast.error(`Upload Failed: ${userMessage}`, { duration: 8000 })
    },
  })

  // Simple preview generation
  const analyzeFile = async (file: File) => {
    try {
      const preview = await previewCsvFile(file)
      setCsvPreview(preview)
      setIsPreviewReady(true)

      return {
        preview,
        totalRows: preview.length,
        message: `Preview of first ${preview.length} items. No duplicate checking - duplicates will be skipped during upload.`,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed'
      toast.error(message)
      throw error
    }
  }

  return {
    // State
    csvPreview,
    isPreviewReady,

    // Actions
    analyzeFile,
    upload: uploadMutation.mutate,
    reset: () => {
      setCsvPreview([])
      setIsPreviewReady(false)
    },

    // Status
    isAnalyzing: false,
    isUploading: uploadMutation.isPending,
    error: uploadMutation.error?.message,

    // Results
    uploadResult: uploadMutation.data,
  }
}
