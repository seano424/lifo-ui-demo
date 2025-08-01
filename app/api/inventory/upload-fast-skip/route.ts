import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { InventoryOperations } from '@/lib/database/operations'

export async function POST(request: NextRequest) {
  console.log('🚀 Upload API called')
  const startTime = Date.now()

  try {
    const supabase = await createClient()
    console.log('✅ Supabase client created')

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    if (!user) {
      console.error('❌ No user found')
      return NextResponse.json({ error: 'No user authenticated' }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.id)

    const formData = await request.formData()
    console.log('✅ Form data parsed')

    const file = formData.get('file') as File
    const storeId = formData.get('storeId') as string

    console.log('📁 File info:', { name: file?.name, size: file?.size, storeId })

    if (!file || !storeId) {
      console.error('❌ Missing file or storeId')
      return NextResponse.json({ error: 'File and store ID required' }, { status: 400 })
    }

    // Validate file
    if (!file.name.toLowerCase().endsWith('.csv')) {
      console.error('❌ Invalid file type:', file.name)
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      console.error('❌ File too large:', file.size)
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    // Use your EXISTING working system - just faster parsing
    console.log('📄 Reading CSV content...')
    const csvContent = await file.text()
    console.log('✅ CSV content read, length:', csvContent.length)

    const csvData = fastParseCSV(csvContent)
    console.log('✅ CSV parsed, items found:', csvData.length)

    if (csvData.length === 0) {
      console.error('❌ No valid data found in CSV')
      return NextResponse.json({ error: 'No valid data found' }, { status: 400 })
    }

    // Use your EXISTING InventoryOperations.processCsvBatch
    console.log('🔧 Creating InventoryOperations...')
    const operations = new InventoryOperations(supabase)
    console.log('✅ InventoryOperations created')

    console.log('⚙️ Processing CSV with InventoryOperations...')
    console.time('processing')
    const result = await operations.processCsvBatch(csvData, storeId, user.id)
    console.timeEnd('processing')
    console.log('✅ Processing complete:', result)

    const totalTime = Date.now() - startTime
    console.log('⏱️ Total time:', totalTime, 'ms')

    // Return in the format your frontend expects
    const response = {
      success: true,
      processed: result.processed,
      skipped: result.errors?.length || 0, // Count errors as skipped
      errors: result.errors || [],
      total_items: csvData.length,
      processing_time_ms: totalTime,
      duplicates_skipped: [], // Simple - no complex duplicate tracking
      performance_metrics: {
        items_per_second: Math.round((result.processed / totalTime) * 1000),
        duplicate_detection_ms: 0,
        database_operations_ms: totalTime,
      },
    }

    console.log('📤 Sending response:', response)
    return NextResponse.json(response)
  } catch (error) {
    console.error('💥 Upload error caught:', error)
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace')

    const message = error instanceof Error ? error.message : 'Unknown error'
    const errorResponse = {
      error: 'Upload failed',
      details: message,
    }

    console.log('📤 Sending error response:', errorResponse)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// SIMPLE fast CSV parser - no complex logic
function fastParseCSV(csvContent: string) {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const data: unknown[] = []

  // Find key columns
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

      const item = {
        SKU: values[skuIndex] || `AUTO-${Date.now()}-${i}`,
        Product_Name: values[nameIndex] || 'Unknown Product',
        Category: values[categoryIndex] || 'dry_goods',
        Quantity: parseInt(values[qtyIndex] || '1') || 1,
        Expiry_Date: values[expiryIndex] || '',
        Brand: values[brandIndex] || 'Unknown',
        Cost_Price: parseFloat(values[costIndex] || '0') || 0,
        Selling_Price: parseFloat(values[priceIndex] || '0') || 0,
        Location: values[locationIndex] || 'MAIN',
        Unit_Type: values[unitIndex] || 'units',
      }

      if (item.Product_Name && item.Expiry_Date) {
        data.push(item)
      }
    } catch (error) {
      console.warn(`Row ${i} error:`, error)
    }
  }

  return data
}
