import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ExistingBatch } from '@/types/duplicate-detection'

export async function POST(request: NextRequest) {
  try {
    const { storeId, sku, expiryDate } = await request.json()

    if (!storeId || !sku || !expiryDate) {
      return NextResponse.json(
        { error: 'Missing required fields: storeId, sku, expiryDate' },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 1: Get the product by SKU
    const { data: product, error: productError } = await supabase
      .schema('inventory')
      .from('products')
      .select('product_id, sku, name')
      .eq('sku', sku)
      .single()

    if (productError || !product) {
      // No product found with this SKU - no duplicates possible
      console.log(`No product found for SKU: ${sku}`)
      return NextResponse.json([])
    }

    // Step 2: Get batches for this product with the same expiry date
    const { data: existingBatches, error: batchError } = await supabase
      .schema('inventory')
      .from('batches')
      .select(
        `
        batch_id,
        batch_number,
        current_quantity,
        expiry_date
      `,
      )
      .eq('store_id', storeId)
      .eq('product_id', product.product_id)
      .eq('expiry_date', expiryDate)
      .eq('status', 'active')

    if (batchError) {
      console.error('Error checking batches:', batchError)
      return NextResponse.json(
        {
          error: 'Failed to check batches',
          details: batchError.message,
        },
        { status: 500 },
      )
    }

    // Transform the data to match our interface
    const batches: ExistingBatch[] = (existingBatches || []).map((batch: any) => ({
      batch_id: batch.batch_id,
      batch_number: batch.batch_number,
      current_quantity: parseFloat(batch.current_quantity),
      expiry_date: batch.expiry_date,
      product: {
        sku: product.sku,
        name: product.name,
      },
    }))

    return NextResponse.json(batches)
  } catch (error) {
    console.error('Error in check-duplicates API:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
