import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface CSVUploadResponse {
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
    product_resolution_ms: number
    batch_insertion_ms: number
    database_operations_ms: number
    store_products_linked?: number
    products_created?: number
    database_processing_time_ms?: number
  }
}

interface CsvPreviewItem {
  SKU: string
  Product_Name: string
  Category: string
  Quantity: number
  Expiry_Date: string
}

export function useCSVUpload() {
  const [csvPreview, setCsvPreview] = useState<CsvPreviewItem[]>([])
  const [isPreviewReady, setIsPreviewReady] = useState(false)
  const queryClient = useQueryClient()

  // Simple CSV preview (first 10 rows)
  const previewCsvFile = async (file: File): Promise<CsvPreviewItem[]> => {
    console.log('📄 [USE-CSV-UPLOAD] Starting CSV preview parsing...')
    const startTime = performance.now()

    const text = await file.text()
    console.log(`📄 [USE-CSV-UPLOAD] File content loaded: ${text.length} characters`)

    const lines = text.trim().split('\n')
    console.log(`📄 [USE-CSV-UPLOAD] CSV lines detected: ${lines.length}`)

    if (lines.length < 2) {
      console.warn('⚠️ [USE-CSV-UPLOAD] CSV file has no data rows')
      return []
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    console.log('📋 [USE-CSV-UPLOAD] CSV headers detected:', headers)

    const preview: CsvPreviewItem[] = []

    const skuIndex = headers.findIndex(h => h.toLowerCase().includes('sku'))
    const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name'))
    const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('category'))
    const qtyIndex = headers.findIndex(h => h.toLowerCase().includes('quantity'))
    const expiryIndex = headers.findIndex(h => h.toLowerCase().includes('expiry'))

    console.log('🎯 [USE-CSV-UPLOAD] Column mapping:', {
      sku: skuIndex >= 0 ? headers[skuIndex] : 'NOT_FOUND',
      name: nameIndex >= 0 ? headers[nameIndex] : 'NOT_FOUND',
      category: categoryIndex >= 0 ? headers[categoryIndex] : 'NOT_FOUND',
      quantity: qtyIndex >= 0 ? headers[qtyIndex] : 'NOT_FOUND',
      expiry: expiryIndex >= 0 ? headers[expiryIndex] : 'NOT_FOUND',
    })

    const previewLimit = Math.min(11, lines.length)
    console.log(`🔍 [USE-CSV-UPLOAD] Processing ${previewLimit - 1} preview rows...`)

    for (let i = 1; i < previewLimit; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      const previewItem = {
        SKU: values[skuIndex] || `AUTO-${i}`,
        Product_Name: values[nameIndex] || 'Unknown Product',
        Category: values[categoryIndex] || 'dry_goods',
        Quantity: parseInt(values[qtyIndex] || '1') || 1,
        Expiry_Date: values[expiryIndex] || '',
      }

      preview.push(previewItem)

      if (i <= 3) {
        console.log(`📦 [USE-CSV-UPLOAD] Sample row ${i}:`, previewItem)
      }
    }

    const endTime = performance.now()
    console.log(
      `✅ [USE-CSV-UPLOAD] Preview parsing completed in ${Math.round(endTime - startTime)}ms`,
    )
    console.log(`📊 [USE-CSV-UPLOAD] Preview ready: ${preview.length} items`)

    setCsvPreview(preview)
    setIsPreviewReady(true)
    return preview
  }

  const mutation = useMutation({
    mutationFn: async ({
      file,
      storeId,
    }: {
      file: File
      storeId: string
    }): Promise<CSVUploadResponse> => {
      console.log('🚀 [USE-CSV-UPLOAD] Mutation started - preparing form data')
      const mutationStartTime = performance.now()

      const formData = new FormData()
      formData.append('file', file)
      formData.append('storeId', storeId)

      console.log(
        '📤 [USE-CSV-UPLOAD] Form data prepared, making API call to /api/inventory/upload',
      )
      console.log('🎯 [USE-CSV-UPLOAD] Upload parameters:', {
        fileName: file.name,
        fileSize: file.size,
        storeId,
        timestamp: new Date().toISOString(),
      })

      // Use the main optimized upload route
      const fetchStartTime = performance.now()
      const response = await fetch('/api/inventory/upload', {
        method: 'POST',
        body: formData,
      })
      const fetchEndTime = performance.now()

      console.log(
        `📡 [USE-CSV-UPLOAD] API response received in ${Math.round(fetchEndTime - fetchStartTime)}ms`,
      )
      console.log('📊 [USE-CSV-UPLOAD] Response status:', response.status, response.statusText)

      if (!response.ok) {
        console.error('❌ [USE-CSV-UPLOAD] Upload failed with status:', response.status)
        const error = await response.json()
        console.error('❌ [USE-CSV-UPLOAD] Error details:', error)
        throw new Error(error.error || `Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      const mutationEndTime = performance.now()

      console.log(
        `✅ [USE-CSV-UPLOAD] Upload mutation completed in ${Math.round(mutationEndTime - mutationStartTime)}ms`,
      )
      console.log('🎉 [USE-CSV-UPLOAD] Raw API response:', result)

      return result
    },
    onSuccess: (data, { storeId }) => {
      console.log('🎉 [USE-CSV-UPLOAD] Upload SUCCESS callback triggered')
      console.log('📊 [USE-CSV-UPLOAD] Success data breakdown:', {
        processed: data.processed,
        total_items: data.total_items,
        processing_time_ms: data.processing_time_ms,
        performance_metrics: data.performance_metrics,
        duplicates_skipped_count: data.duplicates_skipped?.length || 0,
        errors_count: data.errors?.length || 0,
      })

      // Invalidate inventory queries to refresh dashboard
      console.log('🔄 [USE-CSV-UPLOAD] Invalidating query cache for store:', storeId)
      queryClient.invalidateQueries({ queryKey: ['store-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['store-inventory', storeId] })
      queryClient.invalidateQueries({ queryKey: ['expiring-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['batches', storeId] })

      // Cache upload results for error review
      queryClient.setQueryData(['csv-upload-results'], data)
      console.log('💾 [USE-CSV-UPLOAD] Upload results cached for review')

      // Enhanced success notification with detailed performance metrics
      const metrics = data.performance_metrics || {}
      const speed = metrics.items_per_second || 0
      const totalTime = data.processing_time_ms || 0

      console.log('⚡ [USE-CSV-UPLOAD] Performance metrics analysis:', {
        items_per_second: speed,
        total_time_ms: totalTime,
        duplicate_detection_ms: metrics.duplicate_detection_ms,
        product_resolution_ms: metrics.product_resolution_ms,
        batch_insertion_ms: metrics.batch_insertion_ms,
        store_products_linked: metrics.store_products_linked,
      })

      // Create performance breakdown
      const performanceDetails = []
      if (metrics.duplicate_detection_ms) {
        performanceDetails.push(`Duplicates: ${metrics.duplicate_detection_ms}ms`)
      }
      if (metrics.product_resolution_ms) {
        performanceDetails.push(`Products: ${metrics.product_resolution_ms}ms`)
      }
      if (metrics.batch_insertion_ms) {
        performanceDetails.push(`Batches: ${metrics.batch_insertion_ms}ms`)
      }

      const performanceSummary =
        performanceDetails.length > 0 ? ` (${performanceDetails.join(', ')})` : ''

      console.log('🎊 [USE-CSV-UPLOAD] Showing success toast with performance summary')
      toast.success(`🚀 Successfully imported ${data.processed} of ${data.total_items} products`, {
        description:
          data.skipped > 0
            ? `${data.skipped} duplicates auto-skipped • ${speed} items/sec • ${totalTime}ms total${performanceSummary}`
            : `Ultra-fast processing: ${speed} items/sec • ${totalTime}ms total${performanceSummary}`,
        duration: 7000,
      })
    },
    onError: (error: Error) => {
      console.error('💥 [USE-CSV-UPLOAD] Upload ERROR callback triggered')
      console.error('❌ [USE-CSV-UPLOAD] Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      })

      toast.error(`Upload failed: ${error.message}`, {
        description: 'Please check your CSV format and try again',
        duration: 5000,
      })
    },
  })

  return {
    ...mutation,
    previewCsvFile,
    csvPreview,
    isPreviewReady,
    resetPreview: () => {
      setCsvPreview([])
      setIsPreviewReady(false)
    },
  }
}

// Compatibility export for existing code
export const useFastCsvUpload = useCSVUpload

// Sample CSV download hook
export function useDownloadSampleCSV() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/csv/sample')
      if (!response.ok) {
        throw new Error('Failed to download sample CSV')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'lifo-inventory-sample.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    },
    onSuccess: () => {
      toast.success('Sample CSV downloaded successfully')
    },
    onError: () => {
      toast.error('Failed to download sample CSV')
    },
  })
}
