import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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

interface CsvColumnMapping {
  hasExpiryColumn: boolean
  itemsWithoutExpiry: number
}

export function useCSVUpload() {
  const [csvPreview, setCsvPreview] = useState<CsvPreviewItem[]>([])
  const [isPreviewReady, setIsPreviewReady] = useState(false)
  const [columnMapping, setColumnMapping] = useState<CsvColumnMapping>({
    hasExpiryColumn: false,
    itemsWithoutExpiry: 0,
  })
  const queryClient = useQueryClient()

  // Simple CSV preview (first 10 rows)
  const previewCsvFile = async (file: File): Promise<CsvPreviewItem[]> => {
    const _startTime = performance.now()

    const text = await file.text()
    const lines = text.trim().split('\n')

    if (lines.length < 2) {
      console.warn('⚠️ [USE-CSV-UPLOAD] CSV file has no data rows')
      return []
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))

    const preview: CsvPreviewItem[] = []

    const skuIndex = headers.findIndex(h => h.toLowerCase().includes('sku'))
    const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name'))
    const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('category'))
    const qtyIndex = headers.findIndex(h => h.toLowerCase().includes('quantity'))
    const expiryIndex = headers.findIndex(h => h.toLowerCase().includes('expiry'))

    const hasExpiryColumn = expiryIndex >= 0
    let _itemsWithoutExpiry = 0

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      const expiryValue = values[expiryIndex] || ''
      if (!expiryValue) {
        _itemsWithoutExpiry++
      }

      const previewItem = {
        SKU: values[skuIndex] || `AUTO-${i}`,
        Product_Name: values[nameIndex] || 'Unknown Product',
        Category: values[categoryIndex] || 'dry_goods', // Will be mapped using database function
        Quantity: parseInt(values[qtyIndex] || '1', 10) || 1,
        Expiry_Date: expiryValue,
      }

      preview.push(previewItem)
    }

    const _endTime = performance.now()

    // Count total items without expiry in the entire file (not just preview)
    let totalItemsWithoutExpiry = 0
    if (!hasExpiryColumn) {
      totalItemsWithoutExpiry = lines.length - 1 // All data rows
    } else {
      // Count empty expiry dates in the entire file
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
        const expiryValue = values[expiryIndex] || ''
        if (!expiryValue) {
          totalItemsWithoutExpiry++
        }
      }
    }

    setColumnMapping({ hasExpiryColumn, itemsWithoutExpiry: totalItemsWithoutExpiry })
    setCsvPreview(preview)
    setIsPreviewReady(true)
    return preview
  }

  const mutation = useMutation({
    mutationFn: async ({
      file,
      storeId,
      csvData,
    }: {
      file: File
      storeId: string
      csvData?: CsvPreviewItem[]
    }): Promise<CSVUploadResponse> => {
      const _mutationStartTime = performance.now()

      const formData = new FormData()

      // If we have modified CSV data, send it as JSON instead of the original file
      if (csvData && csvData.length > 0) {
        formData.append('csvData', JSON.stringify(csvData))
        formData.append('storeId', storeId)
      } else {
        formData.append('file', file)
        formData.append('storeId', storeId)
      }

      // Use the main optimized upload route
      const _fetchStartTime = performance.now()
      const response = await fetch('/api/inventory/upload', {
        method: 'POST',
        body: formData,
      })
      const _fetchEndTime = performance.now()

      if (!response.ok) {
        console.error('❌ [USE-CSV-UPLOAD] Upload failed with status:', response.status)
        const error = await response.json()
        console.error('❌ [USE-CSV-UPLOAD] Error details:', error)
        throw new Error(error.error || `Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      const _mutationEndTime = performance.now()

      return result
    },
    onSuccess: (data, { storeId }) => {
      // Invalidate inventory queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['store-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['store-inventory', storeId] })
      queryClient.invalidateQueries({ queryKey: ['expiring-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['batches', storeId] })

      // Cache upload results for error review
      queryClient.setQueryData(['csv-upload-results'], data)

      // Enhanced success notification with detailed performance metrics
      const metrics = data.performance_metrics || {}
      const speed = metrics.items_per_second || 0
      const totalTime = data.processing_time_ms || 0

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
      setColumnMapping({ hasExpiryColumn: false, itemsWithoutExpiry: 0 })
    },
    columnMapping,
    updateCsvItemExpiry: (index: number, newExpiryDate: string) => {
      setCsvPreview(prev => {
        const newPreview = prev.map((item, i) =>
          i === index ? { ...item, Expiry_Date: newExpiryDate } : item,
        )

        // Update the count of items without expiry based on the full CSV data
        // Note: this only updates the preview, the full count would need recalculation
        const itemsWithoutExpiry = newPreview.filter(item => !item.Expiry_Date).length
        setColumnMapping(prevMapping => ({ ...prevMapping, itemsWithoutExpiry }))

        return newPreview
      })
    },
    updateCsvItemQuantity: (index: number, newQuantity: number) => {
      setCsvPreview(prev => {
        return prev.map((item, i) =>
          i === index ? { ...item, Quantity: Math.max(1, newQuantity) } : item,
        )
      })
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
