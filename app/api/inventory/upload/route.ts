import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { InventoryOperations } from '@/lib/database/operations'

export async function POST(request: NextRequest) {
  console.log('🚀 [UPLOAD-API] === CSV BULK UPLOAD API CALLED ===')
  const apiStartTime = Date.now()
  console.log('⏰ [UPLOAD-API] Request timestamp:', new Date().toISOString())

  try {
    console.log('🔗 [UPLOAD-API] Creating Supabase client...')
    const supabase = await createClient()
    console.log('✅ [UPLOAD-API] Supabase client created successfully')

    // Get authenticated user
    console.log('🔐 [UPLOAD-API] Checking user authentication...')
    const authStartTime = Date.now()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    const authEndTime = Date.now()

    console.log(`🔐 [UPLOAD-API] Auth check completed in ${authEndTime - authStartTime}ms`)

    if (authError) {
      console.error('❌ [UPLOAD-API] Auth error:', authError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    if (!user) {
      console.error('❌ [UPLOAD-API] No user found in session')
      return NextResponse.json({ error: 'No user authenticated' }, { status: 401 })
    }

    console.log('✅ [UPLOAD-API] User authenticated successfully:', {
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    console.log('📋 [UPLOAD-API] Parsing form data...')
    const formDataStartTime = Date.now()
    const formData = await request.formData()
    const formDataEndTime = Date.now()
    console.log(`✅ [UPLOAD-API] Form data parsed in ${formDataEndTime - formDataStartTime}ms`)

    const file = formData.get('file') as File
    const storeId = formData.get('storeId') as string
    const defaultExpiryDate = formData.get('defaultExpiryDate') as string

    console.log('📁 [UPLOAD-API] File and store info received:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      storeId,
      defaultExpiryDate: defaultExpiryDate || 'none',
      hasFile: !!file,
      hasStoreId: !!storeId,
    })

    if (!file || !storeId) {
      console.error('❌ [UPLOAD-API] Missing required parameters:', {
        hasFile: !!file,
        hasStoreId: !!storeId,
      })
      return NextResponse.json({ error: 'File and store ID required' }, { status: 400 })
    }

    // Validate file
    console.log('🔍 [UPLOAD-API] Validating file...')
    if (!file.name.toLowerCase().endsWith('.csv')) {
      console.error('❌ [UPLOAD-API] Invalid file type:', file.name)
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    const maxFileSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxFileSize) {
      console.error('❌ [UPLOAD-API] File too large:', { size: file.size, maxSize: maxFileSize })
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    console.log('✅ [UPLOAD-API] File validation passed')

    // Fast CSV processing - no Python subprocess overhead
    console.log('📄 [UPLOAD-API] Reading CSV content from file...')
    const csvReadStartTime = Date.now()
    const csvContent = await file.text()
    const csvReadEndTime = Date.now()
    console.log(
      `✅ [UPLOAD-API] CSV content read in ${csvReadEndTime - csvReadStartTime}ms, length: ${csvContent.length} characters`,
    )

    console.log('🔍 [UPLOAD-API] Parsing CSV content...')
    const csvParseStartTime = Date.now()
    const csvData = fastParseCSV(csvContent, defaultExpiryDate)
    const csvParseEndTime = Date.now()
    console.log(
      `✅ [UPLOAD-API] CSV parsed in ${csvParseEndTime - csvParseStartTime}ms, items found: ${csvData.length}`,
    )

    if (defaultExpiryDate) {
      const itemsWithDefaultExpiry = csvData.filter(
        item =>
          typeof item === 'object' &&
          item !== null &&
          'Expiry_Date' in item &&
          (item as Record<string, unknown>).Expiry_Date === defaultExpiryDate,
      ).length
      console.log(`📅 [UPLOAD-API] Applied default expiry date to ${itemsWithDefaultExpiry} items`)
    }

    if (csvData.length === 0) {
      console.error('❌ [UPLOAD-API] No valid data found in CSV file')
      return NextResponse.json({ error: 'No valid data found' }, { status: 400 })
    }

    // Log first few items for debugging
    console.log('📦 [UPLOAD-API] Sample CSV items (first 3):')
    csvData.slice(0, 3).forEach((item, index) => {
      console.log(`   Item ${index + 1}:`, item)
    })

    // Use existing proven InventoryOperations.processCsvBatch
    console.log('🔧 [UPLOAD-API] Creating InventoryOperations instance...')
    const operationsCreateStartTime = Date.now()
    const operations = new InventoryOperations(supabase)
    const operationsCreateEndTime = Date.now()
    console.log(
      `✅ [UPLOAD-API] InventoryOperations created in ${operationsCreateEndTime - operationsCreateStartTime}ms`,
    )

    console.log('⚙️ [UPLOAD-API] === STARTING BULK CSV PROCESSING ===')
    console.log('🎯 [UPLOAD-API] Processing parameters:', {
      itemCount: csvData.length,
      storeId,
      userId: user.id,
      bulkOptimizationEnabled: true,
    })

    const processingStartTime = Date.now()
    const result = await operations.processCsvBatch(csvData, storeId, user.id)
    const processingEndTime = Date.now()

    console.log(
      `⚡ [UPLOAD-API] BULK PROCESSING COMPLETED in ${processingEndTime - processingStartTime}ms`,
    )
    console.log('📊 [UPLOAD-API] Processing results summary:', {
      processed: result.processed,
      errors_count: result.errors?.length || 0,
      duplicates_skipped_count: result.duplicates_skipped?.length || 0,
      performance_metrics: result.performance_metrics,
    })

    const totalTime = Date.now() - apiStartTime
    console.log('⏱️ [UPLOAD-API] Total API time:', totalTime, 'ms')

    // Return enhanced response format with bulk operation metrics
    console.log('📦 [UPLOAD-API] Preparing response object...')
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

    console.log('🎉 [UPLOAD-API] === BULK UPLOAD SUCCESSFUL ===')
    console.log('📊 [UPLOAD-API] Final performance metrics:', {
      total_api_time_ms: totalTime,
      items_processed: result.processed,
      items_per_second: response.performance_metrics.items_per_second,
      duplicate_detection_ms: response.performance_metrics.duplicate_detection_ms,
      batch_insertion_ms: response.performance_metrics.batch_insertion_ms,
      success_rate: `${Math.round((result.processed / csvData.length) * 100)}%`,
    })

    console.log('📤 [UPLOAD-API] Sending success response to client')
    return NextResponse.json(response)
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

    console.log('📤 [UPLOAD-API] Sending error response to client:', errorResponse)
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
        Category: values[categoryIndex] || 'dry_goods',
        Quantity: parseInt(values[qtyIndex] || '1') || 1,
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
