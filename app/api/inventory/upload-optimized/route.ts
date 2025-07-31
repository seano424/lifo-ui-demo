import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { BulkInventoryOperations } from '@/lib/database/bulk-operations'
import { FastCSVProcessor } from '@/lib/csv/fast-processor'

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
  processor_used: 'optimized_bulk'
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const storeId = formData.get('storeId') as string

    if (!file || !storeId) {
      return NextResponse.json(
        { error: 'File and store ID are required' },
        { status: 400 }
      )
    }

    // Quick validations
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV file.' },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Validate store access
    const bulkOps = new BulkInventoryOperations(supabase)
    const hasAccess = await bulkOps.validateStoreAccess(storeId, user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'No access to this store' }, { status: 403 })
    }

    // PERFORMANCE PHASE 1: Fast CSV parsing (JavaScript only, no Python overhead)
    const csvParsingStart = Date.now()
    console.time('csv-parsing-optimized')
    
    const csvContent = await file.text()
    const parseResult = FastCSVProcessor.parseCSV(csvContent)
    
    console.timeEnd('csv-parsing-optimized')
    const csvParsingTime = Date.now() - csvParsingStart

    if (parseResult.items.length === 0) {
      return NextResponse.json(
        { 
          error: 'No valid data found in CSV',
          details: parseResult.errors,
        },
        { status: 400 }
      )
    }

    // PERFORMANCE PHASE 2: Bulk processing with performance monitoring
    console.time('bulk-processing-optimized')
    const bulkProcessingStart = Date.now()
    
    const result = await bulkOps.benchmarkProcessing(parseResult.items, storeId, user.id)
    
    console.timeEnd('bulk-processing-optimized')
    const bulkProcessingTime = Date.now() - bulkProcessingStart

    const totalTime = Date.now() - startTime
    const itemsPerSecond = result.processed > 0 ? Math.round((result.processed / totalTime) * 1000) : 0

    // Success response with detailed performance metrics
    const response: OptimizedUploadResult = {
      success: true,
      processed: result.processed,
      skipped: result.skipped,
      errors: [...parseResult.errors, ...result.errors],
      warnings: [...parseResult.warnings, ...result.warnings],
      total_items: parseResult.total_rows,
      valid_items: parseResult.valid_rows,
      processing_time_ms: totalTime,
      performance_metrics: {
        items_per_second: itemsPerSecond,
        csv_parsing_ms: csvParsingTime,
        duplicate_detection_ms: Math.round(bulkProcessingTime * 0.2), // Estimated
        database_operations_ms: Math.round(bulkProcessingTime * 0.8) // Estimated
      },
      message: `Successfully processed ${result.processed} items in ${totalTime}ms (${itemsPerSecond} items/second)`,
      processor_used: 'optimized_bulk'
    }

    // Performance logging
    console.log('🚀 Optimized CSV Upload Performance:', {
      total_items: parseResult.total_rows,
      processed: result.processed,
      skipped: result.skipped,
      total_time_ms: totalTime,
      items_per_second: itemsPerSecond,
      parsing_time_ms: csvParsingTime,
      processing_time_ms: bulkProcessingTime
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Optimized CSV upload error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
        details: message,
        processed: 0,
        total_items: 0,
        processing_time_ms: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}