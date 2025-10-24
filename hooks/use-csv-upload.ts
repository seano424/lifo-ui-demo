import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Papa from 'papaparse'
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
  const [cachedFileContent, setCachedFileContent] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Helper: convert common date formats to ISO yyyy-MM-dd
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
        year = `20${year}`
      }
      if (+month >= 1 && +month <= 12 && +day >= 1 && +day <= 31) {
        return `${year}-${month}-${day}`
      }
    }

    // Fallback: try Date parse
    const parsed = new Date(s)
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear()
      const m = String(parsed.getMonth() + 1).padStart(2, '0')
      const d = String(parsed.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }

    return ''
  }

  // Validate and parse price values
  const parsePrice = (value: string): number | null => {
    const trimmed = value.trim()
    if (!trimmed) return null

    const parsed = parseFloat(trimmed)
    if (Number.isNaN(parsed) || parsed <= 0) return null

    // Reject absurd values (max $1 million)
    if (parsed > 1000000) return null

    return parsed
  }

  // CSV preview using papaparse for proper parsing
  const previewCsvFile = async (file: File): Promise<CsvPreviewItem[]> => {
    try {
      // Read and cache file content once
      const text = await file.text()
      setCachedFileContent(text)

      return new Promise((resolve, reject) => {
        Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim(),
          complete: results => {
            if (!results.data || results.data.length === 0) {
              reject(new Error('CSV file is empty or has no data rows'))
              return
            }

            const firstRow = results.data[0]
            const headers = Object.keys(firstRow)

            // Find column indices
            const skuCol = headers.find(h => h.toLowerCase().includes('sku'))
            const nameCol = headers.find(h => h.toLowerCase().includes('name'))
            const categoryCol = headers.find(h => h.toLowerCase().includes('category'))
            const qtyCol = headers.find(h => h.toLowerCase().includes('quantity'))
            const expiryCol = headers.find(h => h.toLowerCase().includes('expiry'))
            const costPriceCol = headers.find(
              h => h.toLowerCase().includes('cost') && h.toLowerCase().includes('price'),
            )
            const sellingPriceCol = headers.find(
              h => h.toLowerCase().includes('selling') && h.toLowerCase().includes('price'),
            )

            const hasExpiryColumn = !!expiryCol
            let itemsWithoutExpiry = 0

            const preview: CsvPreviewItem[] = results.data.map((row, index) => {
              const rawExpiry = expiryCol ? row[expiryCol] : ''
              const expiryValue = convertToISODate(rawExpiry)

              if (!expiryValue) {
                itemsWithoutExpiry++
              }

              // Parse prices with validation
              const costPrice = costPriceCol ? parsePrice(row[costPriceCol]) : null
              const sellingPrice = sellingPriceCol ? parsePrice(row[sellingPriceCol]) : null

              return {
                SKU: skuCol ? row[skuCol] : `AUTO-${index + 1}`,
                Product_Name: nameCol ? row[nameCol] : 'Unknown Product',
                Category: categoryCol ? row[categoryCol] : CSV_PROCESSING.DEFAULT_CATEGORY,
                Quantity: qtyCol ? parseInt(row[qtyCol], 10) || 1 : 1,
                Expiry_Date: expiryValue,
                Cost_Price: costPrice ?? 0.01,
                Selling_Price: sellingPrice ?? 0.01,
              }
            })

            setColumnMapping({ hasExpiryColumn, itemsWithoutExpiry })
            setCsvPreview(preview)
            setIsPreviewReady(true)
            resolve(preview)
          },
          error: (error: Error) => {
            reject(new Error(`CSV parsing failed: ${error.message}`))
          },
        })
      })
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[CSV] Preview parsing failed:', error)
      }

      // Reset state on error
      setCsvPreview([])
      setIsPreviewReady(false)
      setColumnMapping({ hasExpiryColumn: false, itemsWithoutExpiry: 0 })
      setCachedFileContent(null)

      const errorMessage = error instanceof Error ? error.message : 'Failed to parse CSV file'
      throw new Error(`CSV parsing failed: ${errorMessage}`)
    }
  }

  // Pure function to normalize CSV: lowercase headers + add pricing columns
  // Pass preview data as parameter to avoid closure dependency
  const normalizeCsvHeaders = (csvContent: string, previewData: CsvPreviewItem[]): string => {
    // Use papaparse to properly handle quoted values
    const parseResult = Papa.parse<Record<string, string>>(csvContent, {
      header: true,
      skipEmptyLines: true,
    })

    if (!parseResult.data || parseResult.data.length === 0) {
      return csvContent
    }

    const firstRow = parseResult.data[0]
    const originalHeaders = Object.keys(firstRow)

    // Normalize headers to lowercase with underscores
    const normalizedHeaders = originalHeaders.map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))

    // Check if pricing columns exist
    const hasCostPrice = normalizedHeaders.some(h => h.includes('cost') && h.includes('price'))
    const hasSellingPrice = normalizedHeaders.some(
      h => h.includes('selling') && h.includes('price'),
    )

    if (!hasCostPrice) {
      normalizedHeaders.push('cost_price')
    }
    if (!hasSellingPrice) {
      normalizedHeaders.push('selling_price')
    }

    // Rebuild CSV with normalized headers and pricing values from preview
    const csvRows = [normalizedHeaders.join(',')]

    parseResult.data.forEach((row, index) => {
      const values = originalHeaders.map(header => row[header] || '')

      // Add pricing values from preview data
      if (!hasCostPrice) {
        values.push((previewData[index]?.Cost_Price || 0.01).toString())
      }
      if (!hasSellingPrice) {
        values.push((previewData[index]?.Selling_Price || 0.01).toString())
      }

      // Escape commas in values by quoting
      const escapedValues = values.map(v =>
        v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v,
      )
      csvRows.push(escapedValues.join(','))
    })

    const result = csvRows.join('\n')

    if (process.env.NODE_ENV === 'development') {
      console.log('[CSV] Normalization complete:', {
        originalHeaders,
        normalizedHeaders,
        totalRows: parseResult.data.length,
      })
    }

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
      // Use cached file content to avoid re-reading
      let csvContent = cachedFileContent
      if (!csvContent) {
        csvContent = await file.text()
        setCachedFileContent(csvContent)
      }

      let fileToUpload = file
      const dataToProcess = csvData || csvPreview

      if (dataToProcess && dataToProcess.length > 0) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        // O(n) filtering with index tracking
        const validIndices = new Set<number>()
        const validItems: CsvPreviewItem[] = []

        dataToProcess.forEach((item, index) => {
          if (item.Expiry_Date) {
            const expiryDate = new Date(item.Expiry_Date)
            if (expiryDate >= sevenDaysAgo) {
              validIndices.add(index)
              validItems.push(item)
            }
          }
        })

        const filteredCount = dataToProcess.length - validItems.length

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

        // O(n) filtering - parse CSV once and filter by index
        const parseResult = Papa.parse<Record<string, string>>(csvContent, {
          header: true,
          skipEmptyLines: true,
        })

        const filteredData = parseResult.data.filter((_, index) => validIndices.has(index))

        // Rebuild CSV with only valid rows
        const filteredCsvContent = Papa.unparse(filteredData, {
          header: true,
        })

        // Normalize with valid items data
        const normalizedContent = normalizeCsvHeaders(filteredCsvContent, validItems)

        fileToUpload = new File([normalizedContent], file.name, {
          type: 'text/csv',
        })
      } else {
        // No filtering needed, but still normalize headers
        const normalizedContent = normalizeCsvHeaders(csvContent, dataToProcess)
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

        if (process.env.NODE_ENV === 'development') {
          console.error('[CSV] Upload failed:', error)
        }

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
      if (process.env.NODE_ENV === 'development') {
        console.error('[CSV] Upload mutation failed:', error)
      }

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
      setCachedFileContent(null) // Clear cached content
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
        // Validate: quantity must be between 1 and 100,000
        const validatedQuantity = Math.max(1, Math.min(100000, Math.floor(newQuantity)))
        return prev.map((item, i) =>
          i === index ? { ...item, Quantity: validatedQuantity } : item,
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
        // Validate: price must be between 0.01 and 1,000,000
        const validatedPrice = Math.max(0.01, Math.min(1000000, newCostPrice))
        return prev.map((item, i) => (i === index ? { ...item, Cost_Price: validatedPrice } : item))
      })
    },
    updateCsvItemSellingPrice: (index: number, newSellingPrice: number) => {
      setCsvPreview(prev => {
        // Validate: price must be between 0.01 and 1,000,000
        const validatedPrice = Math.max(0.01, Math.min(1000000, newSellingPrice))
        return prev.map((item, i) =>
          i === index ? { ...item, Selling_Price: validatedPrice } : item,
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
