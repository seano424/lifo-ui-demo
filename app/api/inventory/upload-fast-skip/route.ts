import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface CsvItem {
  SKU: string
  Product_Name: string
  Category: string
  Quantity: number
  Expiry_Date: string
  Brand?: string
  Cost_Price?: number
  Selling_Price?: number
  Location?: string
  Unit_Type?: string
}

interface FastUploadResult {
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
    database_operations_ms: number
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const supabase = await createClient()

  // Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const storeId = formData.get('storeId') as string

    if (!file || !storeId) {
      return NextResponse.json({ error: 'File and store ID required' }, { status: 400 })
    }

    // Quick validations
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Parse CSV (fast JavaScript parsing)
    console.time('csv-parsing')
    const csvContent = await file.text()
    const csvData = parseCSVFast(csvContent)
    console.timeEnd('csv-parsing')

    if (csvData.length === 0) {
      return NextResponse.json({ error: 'No valid data found' }, { status: 400 })
    }

    // ULTRA-FAST duplicate detection + processing in ONE call
    console.time('bulk-processing-with-skip')
    
    const { data: result, error } = await supabase.rpc('fast_csv_import_skip_duplicates', {
      p_store_id: storeId,
      p_user_id: user.id,
      p_csv_data: JSON.stringify(csvData)
    })

    console.timeEnd('bulk-processing-with-skip')

    if (error) {
      console.error('Fast CSV import error:', error)
      return NextResponse.json({ error: 'Import failed' }, { status: 500 })
    }

    const totalTime = Date.now() - startTime
    const processed = result?.processed || 0
    const skipped = result?.skipped || 0

    const response: FastUploadResult = {
      success: true,
      processed,
      skipped,
      errors: result?.errors || [],
      total_items: csvData.length,
      processing_time_ms: totalTime,
      duplicates_skipped: result?.duplicates_skipped || [],
      performance_metrics: {
        items_per_second: Math.round((processed / totalTime) * 1000),
        duplicate_detection_ms: result?.duplicate_detection_ms || 0,
        database_operations_ms: result?.database_operations_ms || 0
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Fast upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

// Ultra-fast CSV parser (no complex libraries needed)
function parseCSVFast(csvContent: string): CsvItem[] {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const items: CsvItem[] = []

  // Simple header mapping
  const getColumn = (patterns: string[]) => {
    return headers.findIndex(h => 
      patterns.some(p => h.toLowerCase().includes(p.toLowerCase()))
    )
  }

  const skuCol = getColumn(['sku', 'code'])
  const nameCol = getColumn(['name', 'product'])
  const qtyCol = getColumn(['quantity', 'qty'])
  const expiryCol = getColumn(['expiry', 'exp_date', 'expiration'])
  const categoryCol = getColumn(['category', 'type'])
  const brandCol = getColumn(['brand'])
  const costCol = getColumn(['cost', 'cost_price'])
  const priceCol = getColumn(['price', 'selling_price'])
  const locationCol = getColumn(['location'])
  const unitCol = getColumn(['unit'])

  // Process rows
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      
      if (values.length < 3) continue // Skip invalid rows

      const item: CsvItem = {
        SKU: values[skuCol] || `AUTO-${Date.now()}-${i}`,
        Product_Name: values[nameCol] || 'Unknown Product',
        Category: values[categoryCol] || 'dry_goods',
        Quantity: parseInt(values[qtyCol] || '1', 10) || 1,
        Expiry_Date: values[expiryCol] || '',
        Brand: values[brandCol] || 'Unknown',
        Cost_Price: parseFloat(values[costCol] || '0') || 0,
        Selling_Price: parseFloat(values[priceCol] || '0') || 0,
        Location: values[locationCol] || 'MAIN',
        Unit_Type: values[unitCol] || 'units'
      }

      // Basic validation
      if (item.Product_Name && item.Expiry_Date) {
        items.push(item)
      }
    } catch (error) {
      console.warn(`Row ${i} parsing error:`, error)
    }
  }

  return items
}