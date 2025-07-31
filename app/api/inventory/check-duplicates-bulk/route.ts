import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface BulkDuplicateRequest {
  storeId: string
  items: Array<{
    sku: string
    expiryDate: string
    quantity: number
  }>
}

interface BulkDuplicateResponse {
  duplicates: Array<{
    sku: string
    expiryDate: string
    existingBatches: Array<{
      batch_id: string
      batch_number: string
      current_quantity: number
    }>
  }>
  duplicateCount: number
  newItemsCount: number
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { storeId, items }: BulkDuplicateRequest = await request.json()

    if (!storeId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    if (items.length === 0) {
      return NextResponse.json({
        duplicates: [],
        duplicateCount: 0,
        newItemsCount: 0,
      })
    }

    // OPTIMIZATION: Single query to find ALL duplicates at once
    // Build arrays of SKUs and expiry dates for efficient lookup
    const skus = items.map(item => item.sku)
    const expiryDates = items.map(item => item.expiryDate)

    // Single query to detect all duplicates using joins
    const { data: existingBatches, error } = await supabase
      .from('batches')
      .select(
        `
        batch_id,
        batch_number,
        current_quantity,
        expiry_date,
        store_products!inner(
          product:products!inner(
            sku
          )
        )
      `,
      )
      .eq('store_id', storeId)
      .eq('status', 'active')
      .in('store_products.products.sku', skus)
      .in('expiry_date', expiryDates)

    if (error) {
      console.error('Bulk duplicate detection error:', error)
      return NextResponse.json({ error: 'Duplicate detection failed' }, { status: 500 })
    }

    // Process results into lookup map for fast duplicate detection
    const duplicateMap = new Map<string, any[]>()

    existingBatches?.forEach((batch: any) => {
      const sku = batch.store_products?.product?.sku
      if (sku) {
        const key = `${sku}:${batch.expiry_date}`
        if (!duplicateMap.has(key)) {
          duplicateMap.set(key, [])
        }
        duplicateMap.get(key)!.push({
          batch_id: batch.batch_id,
          batch_number: batch.batch_number,
          current_quantity: batch.current_quantity,
        })
      }
    })

    // Build response by checking each CSV item against the duplicate map
    const duplicates = items
      .map(item => {
        const key = `${item.sku}:${item.expiryDate}`
        const existingBatches = duplicateMap.get(key) || []

        if (existingBatches.length > 0) {
          return {
            sku: item.sku,
            expiryDate: item.expiryDate,
            existingBatches,
          }
        }
        return null
      })
      .filter(Boolean) as any[]

    const response: BulkDuplicateResponse = {
      duplicates,
      duplicateCount: duplicates.length,
      newItemsCount: items.length - duplicates.length,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Bulk duplicate detection error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
