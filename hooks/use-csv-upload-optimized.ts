import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface OptimizedUploadResult {
  success: boolean
  processed: number
  skipped: number
  errors: string[]
  warnings: string[]
  total_items: number
  valid_items: number
  processing_time_ms: number
  performance_metrics: {
    items_per_second: number
    csv_parsing_ms: number
    duplicate_detection_ms: number
    database_operations_ms: number
  }
  message: string
}

interface CsvPreviewItem {
  SKU: string
  Product_Name: string
  Category: string
  Quantity: number
  Expiry_Date: string
  Brand?: string
}

interface DuplicateInfo {
  duplicateCount: number
  newItemsCount: number
  totalItems: number
  duplicates: Array<{
    sku: string
    expiryDate: string
    existingBatches: Array<{
      batch_id: string
      batch_number: string
      current_quantity: number
    }>
  }>
}

interface PerformanceMetrics {
  parsing_time_ms: number
  preview_time_ms: number
  duplicate_check_time_ms: number
  total_analysis_time_ms: number
}

export function useOptimizedCsvUpload() {
  const [csvPreview, setCsvPreview] = useState<CsvPreviewItem[]>([])
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)
  const [isPreviewReady, setIsPreviewReady] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const queryClient = useQueryClient()

  // Fast CSV preview parsing (client-side only for instant feedback)
  const previewCsvFile = useCallback(async (file: File): Promise<{ 
    preview: CsvPreviewItem[], 
    totalRows: number,
    parsing_time_ms: number 
  }> => {
    const startTime = Date.now()
    
    const text = await file.text()
    const lines = text.trim().split('\n')
    
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header and one data row')
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    // Parse first 50 rows for comprehensive preview
    const previewLines = lines.slice(1, 51)
    const preview: CsvPreviewItem[] = []

    for (const line of previewLines) {
      try {
        const values = parseCSVLine(line)
        const item = mapRowToPreviewItem(values, headers)
        if (item) {
          preview.push(item)
        }
      } catch (error) {
        console.warn('Preview parsing error:', error)
        // Continue processing other rows
      }
    }

    const parsing_time_ms = Date.now() - startTime

    return {
      preview,
      totalRows: lines.length - 1, // Exclude header
      parsing_time_ms
    }
  }, [])

  // Bulk duplicate detection with performance tracking
  const checkDuplicatesBulk = useCallback(async (
    items: CsvPreviewItem[],
    storeId: string
  ): Promise<{ duplicateInfo: DuplicateInfo, check_time_ms: number }> => {
    const startTime = Date.now()

    const response = await fetch('/api/inventory/check-duplicates-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId,
        items: items.map(item => ({
          sku: item.SKU,
          expiryDate: item.Expiry_Date,
          quantity: item.Quantity
        }))
      })
    })

    if (!response.ok) {
      throw new Error('Failed to check duplicates')
    }

    const result = await response.json()
    const check_time_ms = Date.now() - startTime

    return {
      duplicateInfo: {
        duplicateCount: result.duplicateCount,
        newItemsCount: result.newItemsCount,
        totalItems: items.length,
        duplicates: result.duplicates || []
      },
      check_time_ms
    }
  }, [])

  // Optimized upload mutation with detailed performance tracking
  const uploadMutation = useMutation({
    mutationFn: async ({ file, storeId }: { file: File; storeId: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('storeId', storeId)

      // Use optimized endpoint for maximum performance
      const response = await fetch('/api/inventory/upload-optimized', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      return response.json() as Promise<OptimizedUploadResult>
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      queryClient.invalidateQueries({ queryKey: ['store-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['store-inventory'] })

      // Performance-aware success notification
      const { performance_metrics } = data
      const performanceText = `⚡ ${performance_metrics.items_per_second} items/second`
      
      toast.success(
        `🚀 Upload Complete! ${data.processed} items processed`,
        { 
          description: `${performanceText} • ${data.processing_time_ms}ms total time`,
          duration: 6000 
        }
      )

      // Show performance breakdown in console for debugging
      console.log('🚀 Upload Performance Metrics:', {
        'Total Time': `${data.processing_time_ms}ms`,
        'Items/Second': performance_metrics.items_per_second,
        'CSV Parsing': `${performance_metrics.csv_parsing_ms}ms`,
        'Duplicate Detection': `${performance_metrics.duplicate_detection_ms}ms`,
        'Database Operations': `${performance_metrics.database_operations_ms}ms`,
        'Items Processed': data.processed,
        'Items Skipped': data.skipped
      })

      // Reset state after successful upload
      setCsvPreview([])
      setDuplicateInfo(null)
      setPerformanceMetrics(null)
      setIsPreviewReady(false)
    },
    onError: (error) => {
      console.error('Upload error:', error)
      toast.error(`Upload failed: ${error.message}`, {
        description: 'Please check your CSV format and try again',
        duration: 8000
      })
    }
  })

  // Combined file analysis with performance tracking
  const analyzeFile = useCallback(async (file: File, storeId: string) => {
    const analysisStartTime = Date.now()
    setIsAnalyzing(true)

    try {
      // Step 1: Fast preview parsing
      console.time('csv-preview-parsing')
      const { preview, totalRows, parsing_time_ms } = await previewCsvFile(file)
      console.timeEnd('csv-preview-parsing')
      
      setCsvPreview(preview)

      // Step 2: Bulk duplicate detection
      console.time('bulk-duplicate-detection')
      const { duplicateInfo, check_time_ms } = await checkDuplicatesBulk(preview, storeId)
      console.timeEnd('bulk-duplicate-detection')
      
      setDuplicateInfo({
        ...duplicateInfo,
        totalItems: totalRows // Use actual total, not just preview
      })

      // Step 3: Calculate performance metrics
      const total_analysis_time_ms = Date.now() - analysisStartTime
      const metrics: PerformanceMetrics = {
        parsing_time_ms,
        preview_time_ms: parsing_time_ms, // Same operation
        duplicate_check_time_ms: check_time_ms,
        total_analysis_time_ms
      }
      
      setPerformanceMetrics(metrics)
      setIsPreviewReady(true)

      // Performance logging
      console.log('📊 File Analysis Performance:', {
        'Total Rows': totalRows,
        'Preview Items': preview.length,
        'Parsing Time': `${parsing_time_ms}ms`,
        'Duplicate Check': `${check_time_ms}ms`,
        'Total Analysis': `${total_analysis_time_ms}ms`,
        'Duplicates Found': duplicateInfo.duplicateCount,
        'New Items': duplicateInfo.newItemsCount
      })
      
      return {
        preview,
        totalRows,
        duplicates: duplicateInfo,
        performance: metrics
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed'
      toast.error(message)
      throw error
    } finally {
      setIsAnalyzing(false)
    }
  }, [previewCsvFile, checkDuplicatesBulk])

  // Reset function
  const reset = useCallback(() => {
    setCsvPreview([])
    setDuplicateInfo(null)
    setPerformanceMetrics(null)
    setIsPreviewReady(false)
    setIsAnalyzing(false)
  }, [])

  return {
    // State
    csvPreview,
    duplicateInfo,
    performanceMetrics,
    isPreviewReady,
    isAnalyzing,
    
    // Actions
    analyzeFile,
    upload: uploadMutation.mutate,
    reset,

    // Status
    isUploading: uploadMutation.isPending,
    error: uploadMutation.error?.message,
    
    // Results
    uploadResult: uploadMutation.data
  }
}

// Helper functions for CSV parsing
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

function mapRowToPreviewItem(values: string[], headers: string[]): CsvPreviewItem | null {
  try {
    const getColumnValue = (patterns: string[], defaultValue: any = undefined) => {
      for (const pattern of patterns) {
        const index = headers.findIndex(h => 
          h.toLowerCase().replace(/[^a-z0-9]/g, '_').includes(pattern)
        )
        if (index !== -1 && values[index]) {
          return values[index].replace(/"/g, '').trim()
        }
      }
      return defaultValue
    }

    const sku = getColumnValue(['sku', 'code', 'product_code'])
    const productName = getColumnValue(['product_name', 'name', 'product'])
    const expiryDate = getColumnValue(['expiry_date', 'expiry', 'exp_date'])
    
    // Skip rows with missing critical data
    if (!sku && !productName) {
      return null
    }

    return {
      SKU: sku || `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      Product_Name: productName || 'Unknown Product',
      Category: getColumnValue(['category', 'type'], 'dry_goods'),
      Quantity: parseInt(getColumnValue(['quantity', 'qty'], '1'), 10) || 1,
      Expiry_Date: expiryDate || new Date().toISOString().split('T')[0],
      Brand: getColumnValue(['brand', 'manufacturer'], 'Unknown')
    }
  } catch (error) {
    console.warn('Error mapping CSV row:', error)
    return null
  }
}