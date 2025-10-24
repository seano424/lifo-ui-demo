import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { CSV_PROCESSING, PRICE_CONSTRAINTS, TOAST_DURATIONS } from '@/lib/constants/file-upload'
import { convertToISODate } from '@/lib/utils/date-conversion'
import { logger } from '@/lib/utils/logger'

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

// Raw CSV row data as parsed by PapaParse
// Values are always strings when parsed from CSV, converted to proper types later
interface CsvRawRow {
  [key: string]: string
}

export function useCSVUpload() {
  const [csvPreview, setCsvPreview] = useState<CsvPreviewItem[]>([])
  const [isPreviewReady, setIsPreviewReady] = useState(false)
  const [columnMapping, setColumnMapping] = useState<CsvColumnMapping>({
    hasExpiryColumn: false,
    itemsWithoutExpiry: 0,
  })
  const [cachedFileKey, setCachedFileKey] = useState<string | null>(null)
  const [cachedParsedData, setCachedParsedData] = useState<CsvRawRow[] | null>(null)
  const queryClient = useQueryClient()

  // Generate composite cache key from file metadata
  const generateCacheKey = (file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`
  }

  // Validate and parse price values
  const parsePrice = (value: string): number | null => {
    const trimmed = value.trim()
    if (!trimmed) return null

    const parsed = parseFloat(trimmed)
    // Enforce minimum price (consistent with UI validation)
    if (Number.isNaN(parsed) || parsed < PRICE_CONSTRAINTS.MIN_PRICE) return null

    // Reject absurd values
    if (parsed > PRICE_CONSTRAINTS.MAX_PRICE) return null

    return parsed
  }

  // CSV preview using papaparse for proper parsing
  const previewCsvFile = async (file: File): Promise<CsvPreviewItem[]> => {
    try {
      // Clear cache if different file (using composite key: name + size + lastModified)
      const fileKey = generateCacheKey(file)
      if (cachedFileKey && cachedFileKey !== fileKey) {
        setCachedFileKey(null)
        setCachedParsedData(null)
      }

      // Read file content once
      const text = await file.text()
      setCachedFileKey(fileKey)

      return new Promise((resolve, reject) => {
        Papa.parse<CsvRawRow>(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim(),
          complete: results => {
            if (!results.data || results.data.length === 0) {
              reject(new Error('CSV file is empty or has no data rows'))
              return
            }

            // Cache parsed data for reuse in normalization and upload
            setCachedParsedData(results.data)

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
        logger.error('csv-upload', 'Preview parsing failed', { error })
      }

      // Reset state on error
      setCsvPreview([])
      setIsPreviewReady(false)
      setColumnMapping({ hasExpiryColumn: false, itemsWithoutExpiry: 0 })
      setCachedFileKey(null)
      setCachedParsedData(null)

      const errorMessage = error instanceof Error ? error.message : 'Failed to parse CSV file'
      throw new Error(`CSV parsing failed: ${errorMessage}`)
    }
  }

  // Pure function to normalize CSV: lowercase headers + add pricing columns
  // Uses cached parsed data to avoid re-parsing
  const normalizeCsvHeaders = (parsedData: CsvRawRow[], previewData: CsvPreviewItem[]): string => {
    if (!parsedData || parsedData.length === 0) {
      return ''
    }

    const firstRow = parsedData[0]
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

    parsedData.forEach((row, index) => {
      const values = originalHeaders.map(header => row[header] || '')

      // Add pricing values from preview data
      if (!hasCostPrice) {
        values.push((previewData[index]?.Cost_Price || 0.01).toString())
      }
      if (!hasSellingPrice) {
        values.push((previewData[index]?.Selling_Price || 0.01).toString())
      }

      // Escape special CSV characters: commas, quotes, newlines, carriage returns
      const escapedValues = values.map(v =>
        v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')
          ? `"${v.replace(/"/g, '""')}"`
          : v,
      )
      csvRows.push(escapedValues.join(','))
    })

    const result = csvRows.join('\n')

    if (process.env.NODE_ENV === 'development') {
      logger.log('csv-upload', 'Normalization complete (using cached parse)', {
        originalHeaders,
        normalizedHeaders,
        totalRows: parsedData.length,
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
      let fileToUpload = file
      const dataToProcess = csvData || csvPreview

      // Use cached parsed data to avoid re-parsing
      if (!cachedParsedData) {
        throw new Error('No cached data available. Please preview the file first.')
      }

      if (dataToProcess && dataToProcess.length > 0) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const maxPastExpiryDate = new Date(today)
        maxPastExpiryDate.setDate(maxPastExpiryDate.getDate() - CSV_PROCESSING.MAX_DAYS_PAST_EXPIRY)

        // O(n) filtering with index tracking
        const validIndices = new Set<number>()
        const validItems: CsvPreviewItem[] = []

        dataToProcess.forEach((item, index) => {
          if (item.Expiry_Date) {
            const expiryDate = new Date(item.Expiry_Date)
            if (expiryDate >= maxPastExpiryDate) {
              validIndices.add(index)
              validItems.push(item)
            }
          }
        })

        const filteredCount = dataToProcess.length - validItems.length

        if (filteredCount > 0) {
          toast.warning(
            `Filtered out ${filteredCount} expired items (>${CSV_PROCESSING.MAX_DAYS_PAST_EXPIRY} days past expiry)`,
            {
              description: `Uploading ${validItems.length} valid items with current/future expiry dates`,
              duration: 5000,
            },
          )
        }

        if (validItems.length === 0) {
          throw new Error(
            `All items have expired (>${CSV_PROCESSING.MAX_DAYS_PAST_EXPIRY} days past expiry). Please update expiry dates and try again.`,
          )
        }

        // Validate pricing constraints before upload (prevent bypass via DevTools)
        const invalidPriceItems = validItems.filter(
          item =>
            item.Cost_Price < PRICE_CONSTRAINTS.MIN_PRICE ||
            item.Cost_Price > PRICE_CONSTRAINTS.MAX_PRICE ||
            item.Selling_Price < PRICE_CONSTRAINTS.MIN_PRICE ||
            item.Selling_Price > PRICE_CONSTRAINTS.MAX_PRICE,
        )

        if (invalidPriceItems.length > 0) {
          throw new Error(
            `${invalidPriceItems.length} items have invalid prices. All prices must be between ${PRICE_CONSTRAINTS.MIN_PRICE} and ${PRICE_CONSTRAINTS.MAX_PRICE}.`,
          )
        }

        // O(n) filtering using cached parsed data - no re-parsing!
        const filteredData = cachedParsedData.filter((_, index) => validIndices.has(index))

        // Normalize with valid items data (no parsing, just formatting)
        const normalizedContent = normalizeCsvHeaders(filteredData, validItems)

        fileToUpload = new File([normalizedContent], file.name, {
          type: 'text/csv',
        })
      } else {
        // No filtering needed, but still normalize headers (using cached data)
        const normalizedContent = normalizeCsvHeaders(cachedParsedData, dataToProcess)
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
          logger.error('csv-upload', 'Upload failed', { error })
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
        logger.error('csv-upload', 'Upload mutation failed', { error })
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
      setCachedFileKey(null) // Clear cached file key (composite key)
      setCachedParsedData(null) // Clear cached parsed data
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
        // Truncate to 100 characters (database constraint)
        const truncatedSku = newSku.slice(0, 100)
        return prev.map((item, i) => (i === index ? { ...item, SKU: truncatedSku } : item))
      })
    },
    updateCsvItemProductName: (index: number, newProductName: string) => {
      setCsvPreview(prev => {
        // Truncate to 255 characters (database constraint)
        const truncatedName = newProductName.slice(0, 255)
        return prev.map((item, i) =>
          i === index ? { ...item, Product_Name: truncatedName } : item,
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
        // Validate: price must be within defined constraints
        const validatedPrice = Math.max(
          PRICE_CONSTRAINTS.MIN_PRICE,
          Math.min(PRICE_CONSTRAINTS.MAX_PRICE, newCostPrice),
        )
        return prev.map((item, i) => (i === index ? { ...item, Cost_Price: validatedPrice } : item))
      })
    },
    updateCsvItemSellingPrice: (index: number, newSellingPrice: number) => {
      setCsvPreview(prev => {
        // Validate: price must be within defined constraints
        const validatedPrice = Math.max(
          PRICE_CONSTRAINTS.MIN_PRICE,
          Math.min(PRICE_CONSTRAINTS.MAX_PRICE, newSellingPrice),
        )
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
