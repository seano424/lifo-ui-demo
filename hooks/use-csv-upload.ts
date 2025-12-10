import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { CSV_PROCESSING, PRICE_CONSTRAINTS, TOAST_DURATIONS } from '@/lib/constants/file-upload'
import { convertToISODate } from '@/lib/utils/date-conversion'
import { logger } from '@/lib/utils/logger'

interface CSVUploadResponse {
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
  warnings?: Array<{
    type: string
    severity: string
    message: string
    affected_items: Array<{
      product_name: string
      sku?: string
      error: string
    }>
    total_affected: number
    suggestion?: string
  }>
  has_validation_errors?: boolean
}

interface CSVValidationResponse {
  success: boolean
  partial_success?: boolean
  message: string
  validation_results: {
    status: string
    valid_items: number
    invalid_items: number
    total_items: number
    errors: string[]
    warnings: Array<{
      type: string
      severity: string
      message: string
      affected_items: Array<{
        product_name: string
        sku?: string
        error: string
      }>
      total_affected: number
      suggestion?: string
    }>
  }
  warnings?: Array<{
    type: string
    severity: string
    message: string
    affected_items: Array<{
      product_name: string
      sku?: string
      error: string
    }>
    total_affected: number
    suggestion?: string
  }>
  has_validation_errors?: boolean
  failed_items?: Array<{
    index: number
    product_name: string
    sku?: string
    error: string
  }>
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

/**
 * Valid target column names expected by the backend
 * Used for type safety and validation of column mappings
 */
type ValidTargetColumn =
  | 'sku'
  | 'product_name'
  | 'category'
  | 'quantity'
  | 'expiry_date'
  | 'cost_price'
  | 'selling_price'
  | 'batch_number'

/**
 * Backend-required columns that must be present or generated
 * Used for validation before upload
 */
const REQUIRED_BACKEND_COLUMNS: ValidTargetColumn[] = [
  'sku',
  'product_name',
  'quantity',
  'cost_price',
  'selling_price',
]

/**
 * Maximum length for sanitized column headers
 * Prevents excessively long header names from causing issues
 */
const MAX_COLUMN_NAME_LENGTH = 100

/**
 * Column name mapping for CSV normalization
 * Maps common column name variations to backend-expected column names
 *
 * ⚠️ WARNING: Avoid CSVs with multiple columns that map to the same target.
 * For example, having both "Item Name" and "Product Name" may cause conflicts.
 * The duplicate detection will catch these cases and provide a clear error.
 *
 * Supported mappings:
 * - Quantity: stock_quantity, qty, stock → quantity
 * - Selling Price: sell_price, sale_price, retail_price → selling_price
 * - Cost Price: purchase_price, buy_price, unit_cost → cost_price
 * - Batch Number: batch_lot, lot, lot_number, batch → batch_number
 * - Expiry Date: best_before, use_by, expiration_date, exp_date, expiry → expiry_date
 * - Product Name: item_name, title → product_name
 * - SKU: product_id, product_code, item_code, barcode → sku
 *
 * Note: Removed ambiguous mappings to prevent data corruption:
 * - "price" (ambiguous: could be cost or selling price)
 * - "name" (too generic: conflicts with product_name)
 * - "description" (usually means product description, not product name)
 * - "amount" (ambiguous: could be monetary amount or quantity)
 */
const COLUMN_MAPPINGS = {
  // Quantity variations
  stock_quantity: 'quantity',
  qty: 'quantity',
  stock: 'quantity',

  // Selling price variations
  sell_price: 'selling_price',
  sale_price: 'selling_price',
  retail_price: 'selling_price',

  // Cost price variations
  purchase_price: 'cost_price',
  buy_price: 'cost_price',
  unit_cost: 'cost_price',

  // Batch number variations
  batch_lot: 'batch_number',
  lot: 'batch_number',
  lot_number: 'batch_number',
  batch: 'batch_number',

  // Expiry date variations
  best_before: 'expiry_date',
  use_by: 'expiry_date',
  expiration_date: 'expiry_date',
  exp_date: 'expiry_date',
  expiry: 'expiry_date',

  // Product name variations (reduced to avoid conflicts)
  item_name: 'product_name',
  title: 'product_name',

  // SKU variations
  product_id: 'sku', // Common in inventory exports
  product_code: 'sku',
  item_code: 'sku',
  barcode: 'sku',
} as const satisfies Record<string, ValidTargetColumn>

export function useCSVUpload() {
  const [csvPreview, setCsvPreview] = useState<CsvPreviewItem[]>([])
  const [isPreviewReady, setIsPreviewReady] = useState(false)
  const [columnMapping, setColumnMapping] = useState<CsvColumnMapping>({
    hasExpiryColumn: false,
    itemsWithoutExpiry: 0,
  })
  const [cachedFileKey, setCachedFileKey] = useState<string | null>(null)
  const [cachedParsedData, setCachedParsedData] = useState<CsvRawRow[] | null>(null)
  const [validationResult, setValidationResult] = useState<CSVValidationResponse | null>(null)
  const queryClient = useQueryClient()

  // Generate composite cache key from file metadata
  const generateCacheKey = (file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`
  }

  // Parse price values for preview (accepts all valid numbers including 0)
  /**
   * Sanitize a column header by removing control characters and limiting length
   * @param header - Raw CSV column header
   * @returns Sanitized column header
   */
  const sanitizeColumnHeader = (header: string): string => {
    // Remove control characters (ASCII 0-31, 127, and common problematic Unicode)
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentionally removing control characters for security
    let sanitized = header.replace(/[\x00-\x1F\x7F\uFEFF\u200B-\u200D]/g, '')

    // Trim whitespace
    sanitized = sanitized.trim()

    // Limit length to prevent issues
    if (sanitized.length > MAX_COLUMN_NAME_LENGTH) {
      sanitized = sanitized.slice(0, MAX_COLUMN_NAME_LENGTH)
    }

    return sanitized
  }

  /**
   * Normalize a single column header
   * Converts to lowercase with underscores and applies column mappings
   * @param header - Raw CSV column header
   * @returns Normalized column name
   */
  const normalizeColumnHeader = (header: string): string => {
    const sanitized = sanitizeColumnHeader(header)
    const normalized = sanitized.toLowerCase().replace(/\s+/g, '_')
    return normalized in COLUMN_MAPPINGS
      ? COLUMN_MAPPINGS[normalized as keyof typeof COLUMN_MAPPINGS]
      : normalized
  }

  /**
   * Build a mapping from target column names to original CSV headers
   * Optimized to iterate through headers only once (O(n) instead of O(n²))
   * @param headers - Original CSV column headers
   * @returns Map of target column names to original header names
   */
  const buildColumnMapping = (headers: string[]): Map<string, string> => {
    const mapping = new Map<string, string>()
    for (const header of headers) {
      const normalized = normalizeColumnHeader(header)
      // Store first occurrence only (prevents duplicates from overwriting)
      if (!mapping.has(normalized)) {
        mapping.set(normalized, header)
      }
    }
    return mapping
  }

  /**
   * Find a column header that maps to the target column name
   * Uses same normalization logic as the main CSV processing
   * @param columnMap - Pre-built mapping from buildColumnMapping
   * @param targetColumn - Target column name to find
   * @returns Original CSV header name or undefined
   */
  const findMappedColumn = (
    columnMap: Map<string, string>,
    targetColumn: string,
  ): string | undefined => {
    return columnMap.get(targetColumn)
  }

  // Validate and parse price values
  const parsePrice = (value: string): number | null => {
    const trimmed = value.trim()
    if (!trimmed) return null

    const parsed = parseFloat(trimmed)
    // Only reject NaN and absurd values
    // Note: We allow 0 and negative values for preview display
    // Validation happens during validate/upload, not during preview
    if (Number.isNaN(parsed)) return null
    if (parsed < 0 || parsed > PRICE_CONSTRAINTS.MAX_PRICE) return null

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

            // Build column mapping once for O(n) performance
            const columnMap = buildColumnMapping(headers)

            // Find column indices using consistent mapping logic
            const skuCol = findMappedColumn(columnMap, 'sku')
            const nameCol = findMappedColumn(columnMap, 'product_name')
            const categoryCol = findMappedColumn(columnMap, 'category')
            const qtyCol = findMappedColumn(columnMap, 'quantity')
            const expiryCol = findMappedColumn(columnMap, 'expiry_date')
            const costPriceCol = findMappedColumn(columnMap, 'cost_price')
            const sellingPriceCol = findMappedColumn(columnMap, 'selling_price')

            const hasExpiryColumn = !!expiryCol
            let itemsWithoutExpiry = 0

            const preview: CsvPreviewItem[] = results.data.map((row, index) => {
              const rawExpiry = expiryCol ? row[expiryCol] : ''
              const expiryValue = convertToISODate(rawExpiry)

              if (!expiryValue) {
                itemsWithoutExpiry++
              }

              // Parse prices (allow 0 for preview, validation happens later)
              const costPrice = costPriceCol ? parsePrice(row[costPriceCol]) : null
              const sellingPrice = sellingPriceCol ? parsePrice(row[sellingPriceCol]) : null

              return {
                SKU: skuCol ? row[skuCol] : `AUTO-${index + 1}`,
                Product_Name: nameCol ? row[nameCol] : 'Unknown Product',
                Category: categoryCol ? row[categoryCol] : CSV_PROCESSING.DEFAULT_CATEGORY,
                Quantity: qtyCol ? parseInt(row[qtyCol], 10) || 1 : 1,
                Expiry_Date: expiryValue,
                Cost_Price: costPrice !== null ? costPrice : 0.01,
                Selling_Price: sellingPrice !== null ? sellingPrice : 0.01,
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

  /**
   * Normalize CSV headers and map common column name variations
   *
   * Transforms CSV headers to backend-expected format:
   * 1. Sanitize headers (remove control chars, limit length)
   * 2. Lowercase with underscores (e.g., "Stock Quantity" → "stock_quantity")
   * 3. Apply column mappings (e.g., "stock_quantity" → "quantity")
   * 4. Validate for duplicates and required columns
   * 5. Add missing pricing columns if needed
   *
   * @param parsedData - Raw CSV data from PapaParse
   * @param previewData - Preview data with validated values
   * @returns Normalized CSV string with mapped headers
   */
  const normalizeCsvHeaders = (parsedData: CsvRawRow[], previewData: CsvPreviewItem[]): string => {
    if (!previewData || previewData.length === 0) {
      return ''
    }

    // Use preview data as source of truth (includes all user edits)
    const firstRow = parsedData[0]
    const originalHeaders = Object.keys(firstRow)

    // Step 1: Check for exact duplicate headers in original CSV (before normalization)
    const originalHeaderCounts = new Map<string, number>()
    const exactDuplicates: string[] = []

    originalHeaders.forEach(header => {
      const sanitized = sanitizeColumnHeader(header)
      const count = originalHeaderCounts.get(sanitized) || 0
      originalHeaderCounts.set(sanitized, count + 1)
      if (count > 0) {
        exactDuplicates.push(sanitized)
      }
    })

    if (exactDuplicates.length > 0) {
      const uniqueExactDuplicates = [...new Set(exactDuplicates)]
      throw new Error(
        `Duplicate column names found in CSV: '${uniqueExactDuplicates.join("', '")}'. Each column must have a unique name. Please fix your CSV and try again.`,
      )
    }

    // Step 2: Normalize headers using shared normalization logic
    const normalizedHeaders = originalHeaders.map(h => normalizeColumnHeader(h))

    // Step 3: Detect duplicate columns after mapping (critical for data integrity)
    const seen = new Map<string, string[]>() // Maps normalized name to original headers
    normalizedHeaders.forEach((normalized, index) => {
      const original = originalHeaders[index]
      if (!seen.has(normalized)) {
        seen.set(normalized, [])
      }
      seen.get(normalized)?.push(original)
    })

    // Find columns that have multiple original headers mapping to them
    const ambiguousMappings = Array.from(seen.entries())
      .filter(([_, originals]) => originals.length > 1)
      .map(([normalized, originals]) => ({
        normalized,
        originals,
      }))

    if (ambiguousMappings.length > 0) {
      const errorDetails = ambiguousMappings
        .map(
          ({ normalized, originals }) => `'${normalized}' (from columns: ${originals.join(', ')})`,
        )
        .join('; ')

      throw new Error(
        `Ambiguous column mapping detected: Multiple columns map to the same target. ${errorDetails}. Please rename columns in your CSV to avoid conflicts.`,
      )
    }

    // Step 4: Validate backend-required columns (with generation support)
    const missingRequired: ValidTargetColumn[] = []
    const finalHeaders = [...normalizedHeaders]

    // Check if pricing columns exist (can be generated from preview data)
    const hasCostPrice = normalizedHeaders.includes('cost_price')
    const hasSellingPrice = normalizedHeaders.includes('selling_price')

    // Add missing pricing columns (will be populated from preview data)
    if (!hasCostPrice) {
      finalHeaders.push('cost_price')
    }
    if (!hasSellingPrice) {
      finalHeaders.push('selling_price')
    }

    // Validate other required columns that cannot be auto-generated
    for (const required of REQUIRED_BACKEND_COLUMNS) {
      if (
        !finalHeaders.includes(required) &&
        required !== 'cost_price' &&
        required !== 'selling_price'
      ) {
        missingRequired.push(required)
      }
    }

    if (missingRequired.length > 0) {
      throw new Error(
        `Required columns missing from CSV: ${missingRequired.join(', ')}. Your CSV must include columns that map to these fields. Please add them and try again.`,
      )
    }

    // Step 5: Rebuild CSV with normalized headers and pricing values from preview
    const csvRows = [finalHeaders.join(',')]

    previewData.forEach((item, index) => {
      const originalRow = parsedData[index]

      // Build a map from normalized headers to original CSV headers
      const normalizedToOriginal = new Map<string, string>()
      originalHeaders.forEach((origHeader, idx) => {
        normalizedToOriginal.set(normalizedHeaders[idx], origHeader)
      })

      // Build values in the same order as finalHeaders
      // Use preview data for editable columns, original data for others
      const values = finalHeaders.map(header => {
        // Use preview data for standard editable columns
        switch (header) {
          case 'sku':
            return item.SKU || ''
          case 'product_name':
            return item.Product_Name || ''
          case 'category':
            return item.Category || CSV_PROCESSING.DEFAULT_CATEGORY
          case 'quantity':
            return item.Quantity?.toString() || '1'
          case 'expiry_date':
            return item.Expiry_Date || ''
          case 'cost_price':
            return item.Cost_Price?.toString() || '0.01'
          case 'selling_price':
            return item.Selling_Price?.toString() || '0.01'
          default: {
            // For other columns (like brand, batch_number), use original data
            const originalHeader = normalizedToOriginal.get(header)
            return originalHeader && originalRow ? originalRow[originalHeader] || '' : ''
          }
        }
      })

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
      logger.log('csv-upload', 'Normalization complete (using edited preview data)', {
        finalHeaders,
        totalRows: previewData.length,
      })
    }

    return result
  }

  // Validation mutation - validates CSV without uploading
  const validateMutation = useMutation({
    mutationFn: async ({
      file,
      storeId,
      csvData,
    }: {
      file: File
      storeId: string
      csvData?: CsvPreviewItem[]
    }): Promise<CSVValidationResponse> => {
      let fileToValidate = file
      const dataToProcess = csvData || csvPreview

      // Use cached parsed data to avoid re-parsing
      if (!cachedParsedData) {
        throw new Error('No cached data available. Please preview the file first.')
      }

      if (dataToProcess && dataToProcess.length > 0) {
        // Normalize CSV for validation (same as upload)
        const normalizedContent = normalizeCsvHeaders(cachedParsedData, dataToProcess)
        fileToValidate = new File([normalizedContent], file.name, {
          type: 'text/csv',
        })
      } else {
        const normalizedContent = normalizeCsvHeaders(cachedParsedData, dataToProcess)
        fileToValidate = new File([normalizedContent], file.name, {
          type: 'text/csv',
        })
      }

      const formData = new FormData()
      formData.append('file', fileToValidate)
      formData.append('store_id', storeId)

      // Call validation endpoint (Next.js proxy)
      const response = await fetch('/api/csv-validate', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()

        if (process.env.NODE_ENV === 'development') {
          logger.error('csv-validate', 'Validation failed', { error })
        }

        let errorMessage = 'Validation failed'
        if (error.error) {
          errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error)
        } else if (error.message) {
          errorMessage = error.message
        } else if (error.detail) {
          errorMessage =
            typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail)
        } else {
          errorMessage = `Validation failed: ${response.statusText}`
        }

        throw new Error(errorMessage)
      }

      const result = await response.json()
      return result
    },
    onSuccess: data => {
      setValidationResult(data)

      // Show appropriate toast based on validation results
      if (data.has_validation_errors) {
        toast.warning(`Validation complete: ${data.message}`, {
          description: 'Review warnings below before uploading',
          duration: 5000,
        })
      } else {
        toast.success('✅ All items valid!', {
          description: `${data.validation_results.valid_items} items ready to upload`,
          duration: 3000,
        })
      }
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        logger.error('csv-validate', 'Validation mutation failed', { error })
      }

      setValidationResult(null)

      toast.error(`Validation failed: ${error?.message || 'Unknown error'}`, {
        description: 'Please check your CSV file and try again',
        duration: TOAST_DURATIONS.ERROR,
      })
    },
  })

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
        // Count items with/without dates (no filtering - accept all dates)
        let itemsWithoutDates = 0

        dataToProcess.forEach(item => {
          if (!item.Expiry_Date || item.Expiry_Date.trim() === '') {
            itemsWithoutDates++
          }
        })

        // Show info about upload composition
        if (itemsWithoutDates > 0) {
          toast.info(`Uploading ${dataToProcess.length} items`, {
            description: `${itemsWithoutDates} items without dates will create store products only (no batches)`,
            duration: 4000,
          })
        }

        // Use all items - no filtering based on expiry dates
        const validItems = dataToProcess
        const validIndices = new Set<number>(
          Array.from({ length: dataToProcess.length }, (_, i) => i),
        )

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
      formData.append('chunk_size', '100') // Optimal chunk size (tested on backend)

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

      // Build success message based on what was created
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
            ? `${data.skipped} duplicates auto-skipped • ${speed} items/sec • ${totalTime}ms total${performanceSummary}`
            : `Ultra-fast processing: ${speed} items/sec • ${totalTime}ms total${performanceSummary}`,
        duration: TOAST_DURATIONS.SUCCESS,
      })
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        logger.error('csv-upload', 'Upload mutation failed', {
          error,
          errorMessage: error?.message,
          errorStack: error?.stack,
          errorType: typeof error,
          errorKeys: error ? Object.keys(error) : [],
        })
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
    validate: validateMutation.mutate,
    validateAsync: validateMutation.mutateAsync,
    isValidating: validateMutation.isPending,
    validationResult,
    validationError: validateMutation.error,
    previewCsvFile,
    csvPreview,
    isPreviewReady,
    resetPreview: () => {
      setCsvPreview([])
      setIsPreviewReady(false)
      setColumnMapping({ hasExpiryColumn: false, itemsWithoutExpiry: 0 })
      setCachedFileKey(null) // Clear cached file key (composite key)
      setCachedParsedData(null) // Clear cached parsed data
      setValidationResult(null) // Clear validation result
      mutation.reset() // Reset mutation state to clear uploadResult
      validateMutation.reset() // Reset validation mutation state
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
