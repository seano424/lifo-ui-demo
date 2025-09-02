import { type NextRequest, NextResponse } from 'next/server'
import { InventoryOperations } from '@/lib/database/operations'
import { handleScoringError, scoreAfterCsvUpload } from '@/lib/scoring/batch-scoring-integration'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const apiStartTime = Date.now()

  try {
    const supabase = await createClient()

    // Get authenticated user
    const authStartTime = Date.now()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    const authEndTime = Date.now()

    if (authError) {
      console.error('❌ [UPLOAD-API] Auth error:', authError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    if (!user) {
      console.error('❌ [UPLOAD-API] No user found in session')
      return NextResponse.json({ error: 'No user authenticated' }, { status: 401 })
    }

    const formDataStartTime = Date.now()
    const formData = await request.formData()
    const formDataEndTime = Date.now()

    const file = formData.get('file') as File
    const storeId = formData.get('storeId') as string
    const defaultExpiryDate = formData.get('defaultExpiryDate') as string

    if (!file || !storeId) {
      console.error('❌ [UPLOAD-API] Missing required parameters:', {
        hasFile: !!file,
        hasStoreId: !!storeId,
      })
      return NextResponse.json({ error: 'File and store ID required' }, { status: 400 })
    }

    // Validate file
    if (!file.name.toLowerCase().endsWith('.csv')) {
      console.error('❌ [UPLOAD-API] Invalid file type:', file.name)
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    const maxFileSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxFileSize) {
      console.error('❌ [UPLOAD-API] File too large:', { size: file.size, maxSize: maxFileSize })
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    // Fast CSV processing - no Python subprocess overhead
    const csvReadStartTime = Date.now()
    const csvContent = await file.text()
    const csvReadEndTime = Date.now()

    const csvParseStartTime = Date.now()
    const csvData = fastParseCSV(csvContent, defaultExpiryDate)
    const csvParseEndTime = Date.now()

    if (defaultExpiryDate) {
      const itemsWithDefaultExpiry = csvData.filter(
        item =>
          typeof item === 'object' &&
          item !== null &&
          'Expiry_Date' in item &&
          (item as Record<string, unknown>).Expiry_Date === defaultExpiryDate,
      ).length
    }

    if (csvData.length === 0) {
      console.error('❌ [UPLOAD-API] No valid data found in CSV file')
      return NextResponse.json({ error: 'No valid data found' }, { status: 400 })
    }

    // Log first few items for debugging

    // Use existing proven InventoryOperations.processCsvBatch
    const operationsCreateStartTime = Date.now()
    const operations = new InventoryOperations(supabase)
    const operationsCreateEndTime = Date.now()

    const processingStartTime = Date.now()
    const result = await operations.processCsvBatch(csvData, storeId, user.id)
    const processingEndTime = Date.now()

    const totalTime = Date.now() - apiStartTime

    // Return enhanced response format with bulk operation metrics
    const response = {
      success: true,
      processed: result.processed,
      skipped: result.duplicates_skipped?.length || 0,
      errors: result.errors || [],
      total_items: csvData.length,
      processing_time_ms: totalTime,
      duplicates_skipped: result.duplicates_skipped || [],
      performance_metrics: {
        items_per_second:
          result.performance_metrics?.items_per_second ||
          Math.round((result.processed / totalTime) * 1000),
        duplicate_detection_ms: result.performance_metrics?.duplicate_detection_ms || 0,
        product_resolution_ms: result.performance_metrics?.product_resolution_ms || 0,
        batch_insertion_ms: result.performance_metrics?.batch_insertion_ms || 0,
        database_operations_ms: result.performance_metrics?.total_time_ms || totalTime,
        store_products_linked: result.performance_metrics?.store_products_linked || 0,
        products_created: result.performance_metrics?.products_created || 0,
        database_processing_time_ms: result.performance_metrics?.database_processing_time_ms || 0,
      },
    }

    // PHASE 2: Automatic scoring integration after successful batch creation

    let scoringResult = null
    let scoringWarning = null

    if (process.env.ENABLE_AUTO_SCORING !== 'false' && result.processed > 0) {
      const scoringStartTime = Date.now()

      try {
        scoringResult = await scoreAfterCsvUpload(storeId, result.processed, {
          force_recalculate: true, // New batches always need scoring
        })

        const scoringTime = Date.now() - scoringStartTime

        if (scoringResult.success) {
        } else {
          console.warn('⚠️ [UPLOAD-API] Scoring failed (non-critical):', {
            storeId,
            error: scoringResult.error,
            scoring_time_ms: scoringTime,
          })

          // Handle scoring error gracefully
          const errorHandling = handleScoringError(scoringResult, 'csv_upload')
          scoringWarning = errorHandling.userMessage
        }
      } catch (scoringError) {
        const scoringTime = Date.now() - scoringStartTime
        console.error('❌ [UPLOAD-API] Scoring integration error (non-critical):', {
          storeId,
          error: scoringError instanceof Error ? scoringError.message : 'Unknown error',
          scoring_time_ms: scoringTime,
        })

        scoringWarning =
          'Batches created successfully. Scoring will be calculated in the background.'
      }
    }

    // Enhanced response with scoring information
    const enhancedResponse = {
      ...response,
      scoring: {
        enabled: process.env.ENABLE_AUTO_SCORING !== 'false',
        success: scoringResult?.success || false,
        processed: scoringResult?.success ? scoringResult.data.processed : 0,
        high_priority_count: scoringResult?.success ? scoringResult.data.high_priority_count : 0,
        processing_time_ms: scoringResult?.success ? scoringResult.data.processing_time_ms : 0,
        warning: scoringWarning,
      },
    }

    return NextResponse.json(enhancedResponse)
  } catch (error) {
    const errorTime = Date.now() - apiStartTime
    console.error('💥 [UPLOAD-API] === BULK UPLOAD FAILED ===')
    console.error('💥 [UPLOAD-API] Upload error caught after', errorTime, 'ms')
    console.error('💥 [UPLOAD-API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString(),
    })

    const message = error instanceof Error ? error.message : 'Unknown error'
    const errorResponse = {
      error: 'Upload failed',
      details: message,
      processing_time_ms: errorTime,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Fast CSV parser with intelligent header detection
function fastParseCSV(csvContent: string, defaultExpiryDate?: string) {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const data: unknown[] = []

  // Find key columns intelligently
  const skuIndex = headers.findIndex(
    h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('code'),
  )
  const nameIndex = headers.findIndex(
    h => h.toLowerCase().includes('name') || h.toLowerCase().includes('product'),
  )
  const qtyIndex = headers.findIndex(
    h => h.toLowerCase().includes('quantity') || h.toLowerCase().includes('qty'),
  )
  const expiryIndex = headers.findIndex(
    h => h.toLowerCase().includes('expiry') || h.toLowerCase().includes('exp'),
  )
  const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('category'))
  const brandIndex = headers.findIndex(h => h.toLowerCase().includes('brand'))
  const costIndex = headers.findIndex(h => h.toLowerCase().includes('cost'))
  const priceIndex = headers.findIndex(
    h => h.toLowerCase().includes('selling') || h.toLowerCase().includes('price'),
  )
  const locationIndex = headers.findIndex(h => h.toLowerCase().includes('location'))
  const unitIndex = headers.findIndex(h => h.toLowerCase().includes('unit'))

  // Process each row
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))

      if (values.length < 3) continue

      const expiryValue = values[expiryIndex] || ''
      const finalExpiryDate = expiryValue || defaultExpiryDate || ''

      const item = {
        SKU: values[skuIndex] || `AUTO-${Date.now()}-${i}`,
        Product_Name: values[nameIndex] || 'Unknown Product',
        Category: values[categoryIndex] || 'dry_goods', // Will be mapped using database function
        Quantity: parseInt(values[qtyIndex] || '1', 10) || 1,
        Expiry_Date: finalExpiryDate,
        Brand: values[brandIndex] || 'Unknown',
        Cost_Price: parseFloat(values[costIndex] || '0') || 0,
        Selling_Price: parseFloat(values[priceIndex] || '0') || 0,
        Location: values[locationIndex] || 'MAIN',
        Unit_Type: values[unitIndex] || 'units',
      }

      if (item.Product_Name && item.Expiry_Date) {
        data.push(item)
      } else if (item.Product_Name && defaultExpiryDate) {
        // Allow items without expiry date if we have a default
        data.push(item)
      }
    } catch (error) {
      console.warn(`Row ${i} error:`, error)
    }
  }

  return data
}
