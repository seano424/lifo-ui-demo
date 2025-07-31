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
          Expiry_Date: values[expiryCol] || ''
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
      const formData = new FormData()
      formData.append('file', file)
      formData.append('storeId', storeId)

      const response = await fetch('/api/inventory/upload-fast-skip', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      return response.json() as Promise<FastUploadResult>
    },
    onSuccess: (data) => {
      // Invalidate inventory queries
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      queryClient.invalidateQueries({ queryKey: ['store-analytics'] })

      // Show detailed success message
      const skippedMessage = data.skipped > 0 
        ? `\n${data.skipped} duplicates skipped` 
        : ''
      
      const speedMessage = `\n⚡ ${data.performance_metrics.items_per_second} items/second`

      toast.success(
        `Upload Complete! 🚀\n${data.processed} items processed in ${data.processing_time_ms}ms${skippedMessage}${speedMessage}`,
        { duration: 5000 }
      )

      // Log performance details for debugging
      console.log('🚀 Upload Performance Metrics:', {
        'Total Time': `${data.processing_time_ms}ms`,
        'Items/Second': data.performance_metrics.items_per_second,
        'Duplicate Detection': `${data.performance_metrics.duplicate_detection_ms}ms`,
        'Database Operations': `${data.performance_metrics.database_operations_ms}ms`,
        'Items Processed': data.processed,
        'Items Skipped': data.skipped,
        'Duplicates': data.duplicates_skipped
      })

      // Reset preview
      setCsvPreview([])
      setIsPreviewReady(false)
    },
    onError: (error) => {
      console.error('Fast upload error:', error)
      toast.error(`Upload failed: ${error.message}`)
    }
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
        message: `Preview of first ${preview.length} items. No duplicate checking - duplicates will be skipped during upload.`
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
    uploadResult: uploadMutation.data
  }
}