import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { CSV_PROCESSING, TOAST_DURATIONS } from '@/lib/constants/file-upload'

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
  Cost_Price: number
  Selling_Price: number
  [key: string]: string | number // Allow additional columns
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
    try {
      const text = await file.text()
      const lines = text.trim().split('\n')

      if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows')
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))

      const preview: CsvPreviewItem[] = []

      // Helper: convert common date formats (dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd) to ISO yyyy-MM-dd
      const convertToISODate = (raw: string): string => {
        if (!raw) return ''
        const s = raw.trim()

        // Already ISO-like: 2025-10-18
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

        // dd/mm/yyyy or dd-mm-yyyy
        const dmY = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
        if (dmY) {
          const day = dmY[1].padStart(2, '0')
          const month = dmY[2].padStart(2, '0')
          let year = dmY[3]
          if (year.length === 2) {
            // Assume 20xx for two-digit years
            year = `20${year}`
          }
          // Basic validation
          if (+month >= 1 && +month <= 12 && +day >= 1 && +day <= 31) {
            return `${year}-${month}-${day}`
          }
        }

        // Fallback: try Date parse, then format
        const parsed = new Date(s)
        if (!Number.isNaN(parsed.getTime())) {
          const y = parsed.getFullYear()
          const m = String(parsed.getMonth() + 1).padStart(2, '0')
          const d = String(parsed.getDate()).padStart(2, '0')
          return `${y}-${m}-${d}`
        }

        return ''
      }

      const skuIndex = headers.findIndex(h => h.toLowerCase().includes('sku'))
      const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name'))
      const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('category'))
      const qtyIndex = headers.findIndex(h => h.toLowerCase().includes('quantity'))
      const expiryIndex = headers.findIndex(h => h.toLowerCase().includes('expiry'))
      const costPriceIndex = headers.findIndex(
        h => h.toLowerCase().includes('cost') && h.toLowerCase().includes('price'),
      )
      const sellingPriceIndex = headers.findIndex(
        h => h.toLowerCase().includes('selling') && h.toLowerCase().includes('price'),
      )

      const hasExpiryColumn = expiryIndex >= 0
      let _itemsWithoutExpiry = 0

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
        const rawExpiry = values[expiryIndex] || ''
        const expiryValue = convertToISODate(rawExpiry)
        if (!expiryValue) {
          _itemsWithoutExpiry++
        }

        // Parse pricing values with defaults (0.01 to satisfy DB constraint > 0)
        const costPrice = parseFloat(values[costPriceIndex] || '') || 0.01
        const sellingPrice = parseFloat(values[sellingPriceIndex] || '') || 0.01

        const previewItem = {
          SKU: values[skuIndex] || `AUTO-${i}`,
          Product_Name: values[nameIndex] || 'Unknown Product',
          Category: values[categoryIndex] || CSV_PROCESSING.DEFAULT_CATEGORY,
          Quantity: parseInt(values[qtyIndex] || '1', 10) || 1,
          Expiry_Date: expiryValue,
          Cost_Price: costPrice,
          Selling_Price: sellingPrice,
        }

        preview.push(previewItem)
      }

      // Count total items without expiry in the entire file (not just preview)
      let totalItemsWithoutExpiry = 0
      if (!hasExpiryColumn) {
        totalItemsWithoutExpiry = lines.length - 1 // All data rows
      } else {
        // Count empty expiry dates in the entire file (use normalized ISO)
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
          const rawExpiry = values[expiryIndex] || ''
          const expiryValue = convertToISODate(rawExpiry)
          if (!expiryValue) {
            totalItemsWithoutExpiry++
          }
        }
      }

      setColumnMapping({ hasExpiryColumn, itemsWithoutExpiry: totalItemsWithoutExpiry })
      setCsvPreview(preview)
      setIsPreviewReady(true)
      return preview
    } catch (error) {
      console.error('🔍 [CSV-PREVIEW-ERROR] Failed to parse CSV file:', error)

      // Reset state on error
      setCsvPreview([])
      setIsPreviewReady(false)
      setColumnMapping({ hasExpiryColumn: false, itemsWithoutExpiry: 0 })

      // Re-throw error with user-friendly message
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse CSV file'
      throw new Error(`CSV parsing failed: ${errorMessage}`)
    }
  }

  // Helper function to normalize CSV: lowercase headers + remove ALL quotes + add pricing columns
  const normalizeCsvHeaders = (csvContent: string): string => {
    const lines = csvContent.trim().split('\n')
    if (lines.length === 0) return csvContent

    const originalHeader = lines[0]

    // Parse and normalize the header line (NO quotes)
    const headers = lines[0].split(',').map(h => {
      const cleaned = h.trim().replace(/"/g, '')
      return cleaned.toLowerCase().replace(/\s+/g, '_')
    })

    // ✅ Add pricing columns if missing (to satisfy database constraints)
    // Database requires: cost_price IS NULL OR cost_price > 0
    // Backend bug: defaults to 0 instead of NULL, which violates constraint
    const hasCostPrice = headers.some(h => h.includes('cost') && h.includes('price'))
    const hasSellingPrice = headers.some(h => h.includes('selling') && h.includes('price'))

    if (!hasCostPrice) {
      headers.push('cost_price')
      console.log('🔍 [CSV-NORMALIZE] Added missing cost_price column')
    }
    if (!hasSellingPrice) {
      headers.push('selling_price')
      console.log('🔍 [CSV-NORMALIZE] Added missing selling_price column')
    }

    const normalizedHeader = headers.join(',')

    // ✅ Remove quotes from ALL data rows + add pricing values from csvPreview
    const normalizedDataRows = lines.slice(1).map((line, index) => {
      // Split by comma, remove quotes from each value
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))

      // Add pricing values from preview (or defaults if not in preview yet)
      // Index matches data row index in csvPreview
      if (!hasCostPrice) {
        const costPrice = csvPreview[index]?.Cost_Price || 0.01
        values.push(costPrice.toString())
      }
      if (!hasSellingPrice) {
        const sellingPrice = csvPreview[index]?.Selling_Price || 0.01
        values.push(sellingPrice.toString())
      }

      return values.join(',')
    })

    const result = [normalizedHeader, ...normalizedDataRows].join('\n')

    // 🐛 DEBUG: Log transformation
    console.log('🔍 [CSV-NORMALIZE] Original header:', originalHeader)
    console.log('🔍 [CSV-NORMALIZE] Normalized header:', normalizedHeader)
    console.log('🔍 [CSV-NORMALIZE] Total rows (including header):', lines.length)
    console.log(
      '🔍 [CSV-NORMALIZE] First 3 normalized data rows:',
      normalizedDataRows.slice(0, 3).join('\n'),
    )

    return result
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
      // ⚠️ WORKAROUND: Backend rejects entire batch if ONE item has expired date
      // Filter out items with dates more than 7 days in the past to allow valid items through
      let fileToUpload = file

      if (csvData && csvData.length > 0) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const validItems = csvData.filter(item => {
          if (!item.Expiry_Date) return false
          const expiryDate = new Date(item.Expiry_Date)
          return expiryDate >= sevenDaysAgo
        })

        const filteredCount = csvData.length - validItems.length

        if (filteredCount > 0) {
          toast.warning(`Filtered out ${filteredCount} expired items (>7 days past expiry)`, {
            description: `Uploading ${validItems.length} valid items with current/future expiry dates`,
            duration: 5000,
          })
        }

        if (validItems.length === 0) {
          throw new Error(
            'All items have expired (>7 days past expiry). Please update expiry dates and try again.',
          )
        }

        // ✅ Rebuild CSV using validItems (which already have parsed dates)
        // This avoids re-parsing dates which can fail with DD-MM-YYYY format
        const originalText = await file.text()
        const allLines = originalText.trim().split('\n')
        const headerLine = allLines[0]

        // Create a Set of valid SKUs for efficient lookup
        const validSkus = new Set(validItems.map(item => item.SKU))

        // Parse original CSV to find matching rows
        const originalHeaders = headerLine.split(',').map(h => h.trim().replace(/"/g, ''))
        const skuIndex = originalHeaders.findIndex(h => h.toLowerCase().includes('sku'))

        const validRowLines = [headerLine]
        for (let i = 1; i < allLines.length; i++) {
          const values = allLines[i].split(',').map(v => v.trim().replace(/"/g, ''))
          const sku = values[skuIndex] || ''
          // Include row if its SKU is in the validItems set
          if (validSkus.has(sku)) {
            validRowLines.push(allLines[i])
          }
        }

        const csvContent = validRowLines.join('\n')
        // ✅ Normalize headers to lowercase before uploading
        const normalizedContent = normalizeCsvHeaders(csvContent)

        fileToUpload = new File([normalizedContent], file.name, {
          type: 'text/csv',
        })
      } else {
        // ✅ No filtering needed, but still normalize headers
        const originalText = await file.text()
        const normalizedContent = normalizeCsvHeaders(originalText)
        fileToUpload = new File([normalizedContent], file.name, {
          type: 'text/csv',
        })
      }

      const formData = new FormData()
      formData.append('file', fileToUpload)
      formData.append('store_id', storeId)

      // Use Next.js API route proxy (securely forwards to FastAPI with service role key)
      const response = await fetch('/api/csv-upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()

        // 🐛 DEBUG: Log the full error to investigate 400 errors
        console.error('🔍 [CSV-UPLOAD-ERROR] Full error response:', JSON.stringify(error, null, 2))

        // ✅ Enhanced error handling for validation failures
        if (response.status === 422 && error.common_errors) {
          // Extract common validation errors
          const commonErrors = error.common_errors as string[]
          const uniqueErrors = [
            ...new Set(
              commonErrors.map((err: string) => {
                // Extract just the error message (e.g., "Expiry date too far in past")
                const match = err.match(/: (.+)$/)
                return match ? match[1] : err
              }),
            ),
          ]

          const errorMessage = `${error.error}: ${uniqueErrors.join(', ')}`
          throw new Error(errorMessage)
        }

        // ✅ FIX: Properly stringify error messages (handle objects)
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

      // FastAPI now handles all database writes - no separate save phase needed
      return result
    },
    onSuccess: async (data, { storeId }) => {
      // Invalidate inventory queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['store-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['store-inventory', storeId] })
      queryClient.invalidateQueries({ queryKey: ['expiring-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['batches', storeId] })

      // Invalidate todos queries (CSV import affects urgency states)
      queryClient.invalidateQueries({ queryKey: ['todos', 'urgent-count', storeId] })
      queryClient.invalidateQueries({ queryKey: ['todos', 'summary', storeId] })

      // Cache upload results for error review
      queryClient.setQueryData(['csv-upload-results'], data)

      // ✅ REMOVED: Duplicate scoring trigger - backend already handles this automatically
      // Backend triggers scoring in background (see auto_scoring in response)
      // No need for frontend to trigger it again (was causing 41s blocking delay)

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
        duration: TOAST_DURATIONS.SUCCESS,
      })
    },
    onError: (error: Error) => {
      // Enhanced error handling to prevent app crashes
      console.error('🔍 [CSV-UPLOAD-ERROR] Upload mutation failed:', error)

      const errorMessage = error?.message || 'Unknown error occurred'
      const errorDescription = errorMessage.includes('constraint')
        ? 'Database validation failed. Please check your pricing values (must be greater than 0).'
        : 'Please check your CSV format and try again'

      toast.error(`Upload failed: ${errorMessage}`, {
        description: errorDescription,
        duration: TOAST_DURATIONS.ERROR,
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
      mutation.reset() // Reset mutation state to clear uploadResult
    },
    columnMapping,
    updateCsvItemExpiry: (index: number, newExpiryDate: string) => {
      setCsvPreview(prev => {
        const newPreview = prev.map((item, i) =>
          i === index ? { ...item, Expiry_Date: newExpiryDate } : item,
        )

        // Update the count of items without expiry based on the full CSV data
        // Note: this only updates the preview, the full count would need recalculation
        const itemsWithoutExpiry = newPreview.filter(
          item => !item.Expiry_Date || item.Expiry_Date.trim() === '',
        ).length
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
    updateCsvItemSku: (index: number, newSku: string) => {
      setCsvPreview(prev => {
        return prev.map((item, i) => (i === index ? { ...item, SKU: newSku } : item))
      })
    },
    updateCsvItemProductName: (index: number, newProductName: string) => {
      setCsvPreview(prev => {
        return prev.map((item, i) =>
          i === index ? { ...item, Product_Name: newProductName } : item,
        )
      })
    },
    updateCsvItemCategory: (index: number, newCategory: string) => {
      setCsvPreview(prev => {
        return prev.map((item, i) => (i === index ? { ...item, Category: newCategory } : item))
      })
    },
    updateCsvItemCostPrice: (index: number, newCostPrice: number) => {
      setCsvPreview(prev => {
        return prev.map((item, i) =>
          i === index ? { ...item, Cost_Price: Math.max(0.01, newCostPrice) } : item,
        )
      })
    },
    updateCsvItemSellingPrice: (index: number, newSellingPrice: number) => {
      setCsvPreview(prev => {
        return prev.map((item, i) =>
          i === index ? { ...item, Selling_Price: Math.max(0.01, newSellingPrice) } : item,
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
