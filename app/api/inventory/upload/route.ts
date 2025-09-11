import { type NextRequest, NextResponse } from 'next/server'
import { CSV_PROCESSING } from '@/lib/constants/file-upload'
import { InventoryOperations } from '@/lib/database/operations'
import { handleScoringError, scoreAfterCsvUpload } from '@/lib/scoring/batch-scoring-integration'
import { createClient } from '@/lib/supabase/server'
import { validateUploadFile } from '@/lib/utils/file-validation'

export async function POST(request: NextRequest) {
  const apiStartTime = Date.now()

  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('❌ [UPLOAD-API] Auth error:', authError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    if (!user) {
      console.error('❌ [UPLOAD-API] No user found in session')
      return NextResponse.json({ error: 'No user authenticated' }, { status: 401 })
    }

    const formData = await request.formData()

    const file = formData.get('file') as File
    const csvData = formData.get('csvData') as string
    const storeId = formData.get('storeId') as string
    const defaultExpiryDate = formData.get('defaultExpiryDate') as string

    if ((!file && !csvData) || !storeId) {
      console.error('❌ [UPLOAD-API] Missing required parameters:', {
        hasFile: !!file,
        hasCsvData: !!csvData,
        hasStoreId: !!storeId,
      })
      return NextResponse.json({ error: 'File and store ID required' }, { status: 400 })
    }

    let processedCsvData: unknown[]

    if (csvData) {
      // Handle JSON CSV data sent from the frontend
      try {
        const parsedCsvData = JSON.parse(csvData)
        if (!Array.isArray(parsedCsvData) || parsedCsvData.length === 0) {
          console.error('❌ [UPLOAD-API] Invalid CSV data provided')
          return NextResponse.json({ error: 'Invalid CSV data provided' }, { status: 400 })
        }

        // Apply the same validation logic as fastParseCSV but be more permissive
        // The frontend should ensure all items have expiry dates before sending
        const validItems = parsedCsvData.filter(item => {
          // Item must have a product name
          if (!item.Product_Name || item.Product_Name.trim() === '') return false

          // For JSON data from frontend, all items should have expiry dates since upload button is disabled otherwise
          // But let's be defensive and apply default if provided
          if (!item.Expiry_Date || item.Expiry_Date.trim() === '') {
            if (defaultExpiryDate && defaultExpiryDate.trim() !== '') {
              item.Expiry_Date = defaultExpiryDate
              return true
            }
            console.warn('❌ [UPLOAD-API] Item missing expiry date:', item.Product_Name)
            return false
          }

          return true
        })

        processedCsvData = validItems
        console.log('📊 [UPLOAD-API] Filtered CSV data:', {
          originalCount: parsedCsvData.length,
          validCount: validItems.length,
          hasDefaultExpiry: !!defaultExpiryDate,
        })
      } catch (error) {
        console.error('❌ [UPLOAD-API] Failed to parse CSV data:', error)
        return NextResponse.json({ error: 'Invalid CSV data format' }, { status: 400 })
      }
    } else if (file) {
      // Handle file upload
      // Comprehensive file validation
      const validation = validateUploadFile(file)
      if (!validation.isValid) {
        console.error('❌ [UPLOAD-API] File validation failed:', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          error: validation.error,
        })
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }

      // Fast CSV processing - no Python subprocess overhead
      const csvContent = await file.text()
      processedCsvData = fastParseCSV(csvContent, defaultExpiryDate)
    } else {
      return NextResponse.json({ error: 'No file or CSV data provided' }, { status: 400 })
    }

    if (processedCsvData.length === 0) {
      console.error('❌ [UPLOAD-API] No valid data found in CSV')
      return NextResponse.json({ error: 'No valid data found' }, { status: 400 })
    }

    // Log first few items for debugging

    // Use existing proven InventoryOperations.processCsvBatch
    const operations = new InventoryOperations(supabase)
    const result = await operations.processCsvBatch(processedCsvData, storeId, user.id)

    const totalTime = Date.now() - apiStartTime

    // Return enhanced response format with bulk operation metrics
    const response = {
      success: true,
      processed: result.processed,
      skipped: result.duplicates_skipped?.length || 0,
      errors: result.errors || [],
      total_items: processedCsvData.length,
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
        Category: values[categoryIndex] || CSV_PROCESSING.DEFAULT_CATEGORY,
        Quantity: parseInt(values[qtyIndex] || '1', 10) || 1,
        Expiry_Date: finalExpiryDate,
        Brand: values[brandIndex] || 'Unknown',
        Cost_Price: parseFloat(values[costIndex] || '0') || 0,
        Selling_Price: parseFloat(values[priceIndex] || '0') || 0,
        Location: values[locationIndex] || CSV_PROCESSING.DEFAULT_LOCATION,
        Unit_Type: values[unitIndex] || CSV_PROCESSING.DEFAULT_UNIT_TYPE,
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
