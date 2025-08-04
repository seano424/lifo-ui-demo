/**
 * Inventory submission operations for the scanning workflow
 * Handles the complete workflow: Product → Store Product → Batch creation
 * Follows established patterns for React Query integration
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
import { BATCH_SOURCES } from '@/types/inventory'

export interface ScannedProductData {
  barcode: string
  productName: string
  brand?: string
  category?: string
  openFoodFactsData?: unknown
  // Store-specific data
  storeId: string
  costPrice: number
  sellingPrice: number
  // Batch data
  expiryDate: string
  quantity: number
  ocrExtractedDate?: string
  ocrConfidence?: number
}

export interface InventorySubmissionResult {
  success: boolean
  productId: string
  storeProductCreated: boolean
  batchId: string
  message: string
}

/**
 * Main submission function: Complete workflow from scanned product to inventory batch
 * This handles the entire flow shown in the task description:
 * 1. UPSERT to inventory.products (create/update product from barcode data)
 * 2. UPSERT to inventory.store_products (link product to current store with pricing)
 * 3. CREATE batch in inventory.batches (new batch with expiration date and quantity)
 */
export async function submitScannedProductToInventory(
  productData: ScannedProductData,
): Promise<InventorySubmissionResult> {
  const supabase = createClient()

  try {
    console.log('[submitScannedProductToInventory] Starting submission:', {
      barcode: productData.barcode,
      storeId: productData.storeId,
      productName: productData.productName,
    })

    // Step 1: UPSERT to inventory.products table
    const product = await upsertGlobalProduct(productData)
    console.log('[submitScannedProductToInventory] Product upserted:', product.product_id)

    // Step 2: UPSERT to inventory.store_products table
    const { created: storeProductCreated } = await upsertStoreProduct(
      product.product_id,
      productData,
    )
    console.log('[submitScannedProductToInventory] Store product upserted:', {
      productId: product.product_id,
      storeId: productData.storeId,
      created: storeProductCreated,
    })

    // Step 3: CREATE new batch in inventory.batches table
    const batch = await createProductBatch(product.product_id, productData)
    console.log('[submitScannedProductToInventory] Batch created:', batch.batch_id)

    return {
      success: true,
      productId: product.product_id,
      storeProductCreated,
      batchId: batch.batch_id,
      message: `Successfully added ${productData.quantity} units of ${productData.productName} to inventory`,
    }
  } catch (error) {
    console.error('[submitScannedProductToInventory] Submission failed:', error)

    return {
      success: false,
      productId: '',
      storeProductCreated: false,
      batchId: '',
      message: error instanceof Error ? error.message : 'Failed to submit product to inventory',
    }
  }
}

/**
 * Step 1: UPSERT to inventory.products table
 * Creates or updates the global product record based on barcode
 */
async function upsertGlobalProduct(
  productData: ScannedProductData,
): Promise<Database['inventory']['Tables']['products']['Row']> {
  const supabase = createClient()

  try {
    // First, try to find existing product by barcode
    if (productData.barcode) {
      const { data: existingProduct } = await supabase
        .schema('inventory')
        .from('products')
        .select('*')
        .eq('barcode', productData.barcode)
        .single()

      if (existingProduct) {
        console.log(
          '[upsertGlobalProduct] Found existing product by barcode:',
          existingProduct.product_id,
        )

        // Update existing product with any new information
        const updates: Partial<Database['inventory']['Tables']['products']['Update']> = {
          updated_at: new Date().toISOString(),
        }

        // Only update fields if we have better information
        if (
          productData.productName &&
          productData.productName.length > (existingProduct.name?.length || 0)
        ) {
          updates.name = productData.productName
        }
        if (productData.brand && !existingProduct.brand) {
          updates.brand = productData.brand
        }
        if (productData.category && !existingProduct.category) {
          updates.category = productData.category
        }
        if (productData.openFoodFactsData && !existingProduct.open_food_facts_data) {
          updates.open_food_facts_data = productData.openFoodFactsData
        }

        // Only update if we have meaningful changes
        if (Object.keys(updates).length > 1) {
          // More than just updated_at
          const { data: updatedProduct, error } = await supabase
            .schema('inventory')
            .from('products')
            .update(updates)
            .eq('product_id', existingProduct.product_id)
            .select()
            .single()

          if (error) {
            console.error('[upsertGlobalProduct] Failed to update existing product:', error)
            // Continue with existing product data if update fails
            return existingProduct
          }

          return updatedProduct
        }

        return existingProduct
      }
    }

    // Product doesn't exist, create new one
    console.log('[upsertGlobalProduct] Creating new global product')

    const newProductData: Database['inventory']['Tables']['products']['Insert'] = {
      name: productData.productName,
      brand: productData.brand || null,
      category: productData.category || 'other',
      barcode: productData.barcode || null,
      description: null,
      image_url: null,
      sku: `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique SKU
      unit_type: 'unit',
      typical_shelf_life_days: calculateShelfLifeFromCategory(productData.category),
      base_cost_price: productData.costPrice,
      base_selling_price: productData.sellingPrice,
      open_food_facts_data: productData.openFoodFactsData || null,
      created_by: (await supabase.auth.getUser()).data.user?.id || null,
      total_stock: 0, // Will be updated by database triggers
      active_batches_count: 0, // Will be updated by database triggers
      avg_days_to_expiry: null,
    }

    const { data: newProduct, error } = await supabase
      .schema('inventory')
      .from('products')
      .insert(newProductData)
      .select()
      .single()

    if (error) {
      console.error('[upsertGlobalProduct] Failed to create product:', error)
      throw new Error(`Failed to create product: ${error.message}`)
    }

    return newProduct
  } catch (error) {
    console.error('[upsertGlobalProduct] Unexpected error:', error)
    throw error
  }
}

/**
 * Step 2: UPSERT to inventory.store_products table
 * Links the product to the current store with store-specific pricing
 */
async function upsertStoreProduct(
  productId: string,
  productData: ScannedProductData,
): Promise<{ created: boolean }> {
  const supabase = createClient()

  try {
    // Check if store-product association already exists
    const { data: existingStoreProduct } = await supabase
      .schema('inventory')
      .from('store_products')
      .select('*')
      .eq('store_id', productData.storeId)
      .eq('product_id', productId)
      .single()

    if (existingStoreProduct) {
      console.log('[upsertStoreProduct] Store product association already exists')

      // Update store-specific pricing if different
      const updates: Partial<Database['inventory']['Tables']['store_products']['Update']> = {
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getUser()).data.user?.id || null,
      }

      // Update prices if they're different (within reasonable tolerance)
      const priceTolerance = 0.01
      if (
        Math.abs((existingStoreProduct.cost_price || 0) - productData.costPrice) > priceTolerance
      ) {
        updates.cost_price = productData.costPrice
      }
      if (
        Math.abs((existingStoreProduct.selling_price || 0) - productData.sellingPrice) >
        priceTolerance
      ) {
        updates.selling_price = productData.sellingPrice
      }

      // Ensure it's active
      if (!existingStoreProduct.is_active) {
        updates.is_active = true
      }

      // Only update if we have meaningful changes
      if (Object.keys(updates).length > 2) {
        // More than just updated_at and updated_by
        const { error } = await supabase
          .schema('inventory')
          .from('store_products')
          .update(updates)
          .eq('store_id', productData.storeId)
          .eq('product_id', productId)

        if (error) {
          console.error('[upsertStoreProduct] Failed to update store product:', error)
          // Continue anyway - the association exists
        }
      }

      return { created: false }
    }

    // Create new store-product association
    console.log('[upsertStoreProduct] Creating new store product association')

    const newStoreProductData: Database['inventory']['Tables']['store_products']['Insert'] = {
      store_id: productData.storeId,
      product_id: productId,
      cost_price: productData.costPrice,
      selling_price: productData.sellingPrice,
      is_active: true,
      store_sku: null,
      supplier_code: null,
      added_by: (await supabase.auth.getUser()).data.user?.id || null,
    }

    const { error } = await supabase
      .schema('inventory')
      .from('store_products')
      .insert(newStoreProductData)

    if (error) {
      console.error('[upsertStoreProduct] Failed to create store product:', error)
      throw new Error(`Failed to link product to store: ${error.message}`)
    }

    return { created: true }
  } catch (error) {
    console.error('[upsertStoreProduct] Unexpected error:', error)
    throw error
  }
}

/**
 * Step 3: CREATE new batch in inventory.batches table
 * Creates a new inventory batch with expiry date and quantity
 */
async function createProductBatch(
  productId: string,
  productData: ScannedProductData,
): Promise<Database['inventory']['Tables']['batches']['Row']> {
  const supabase = createClient()

  try {
    console.log('[createProductBatch] Creating new batch for product:', productId)

    // Generate unique batch number
    const batchNumber = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    const newBatchData: Database['inventory']['Tables']['batches']['Insert'] = {
      batch_number: batchNumber,
      product_id: productId,
      store_id: productData.storeId,
      supplier: 'Scanned Entry',
      manufacture_date: null, // Could be extracted from OCR in the future
      expiry_date: productData.expiryDate,
      received_date: new Date().toISOString(), // Today
      initial_quantity: productData.quantity,
      current_quantity: productData.quantity,
      cost_price: productData.costPrice,
      selling_price: productData.sellingPrice,
      location_code: 'DEFAULT',
      batch_source: BATCH_SOURCES.BARCODE,
      status: 'active',
      scanned_barcode: productData.barcode || null,
      ocr_extracted_date: productData.ocrExtractedDate || null,
      ocr_confidence: productData.ocrConfidence || null,
      created_by: (await supabase.auth.getUser()).data.user?.id || null,
    }

    const { data: newBatch, error } = await supabase
      .schema('inventory')
      .from('batches')
      .insert(newBatchData)
      .select()
      .single()

    if (error) {
      console.error('[createProductBatch] Failed to create batch:', error)

      if (error.code === '23505' && error.message.includes('batch_number')) {
        // Batch number collision, retry with different number
        console.log('[createProductBatch] Batch number collision, retrying...')
        const retryBatchData = {
          ...newBatchData,
          batch_number: `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        }

        const { data: retryBatch, error: retryError } = await supabase
          .schema('inventory')
          .from('batches')
          .insert(retryBatchData)
          .select()
          .single()

        if (retryError) {
          throw new Error(`Failed to create batch after retry: ${retryError.message}`)
        }

        return retryBatch
      }

      throw new Error(`Failed to create batch: ${error.message}`)
    }

    return newBatch
  } catch (error) {
    console.error('[createProductBatch] Unexpected error:', error)
    throw error
  }
}

/**
 * Helper: Calculate typical shelf life based on category
 */
function calculateShelfLifeFromCategory(category?: string): number {
  const categoryLifeMap: Record<string, number> = {
    fresh_produce: 7,
    dairy: 14,
    bakery: 3,
    meat: 5,
    fish: 3,
    frozen: 90,
    packaged: 365,
    beverages: 180,
    snacks: 180,
    other: 30,
  }

  return categoryLifeMap[category?.toLowerCase() || 'other'] || 30
}

/**
 * Batch submission for multiple scanned items
 */
export async function submitMultipleScannedProducts(products: ScannedProductData[]): Promise<{
  success: boolean
  results: InventorySubmissionResult[]
  successCount: number
  failureCount: number
}> {
  console.log('[submitMultipleScannedProducts] Submitting batch:', products.length, 'products')

  const results: InventorySubmissionResult[] = []
  let successCount = 0
  let failureCount = 0

  // Process each product sequentially to avoid conflicts
  for (const productData of products) {
    try {
      const result = await submitScannedProductToInventory(productData)
      results.push(result)

      if (result.success) {
        successCount++
      } else {
        failureCount++
      }
    } catch (error) {
      console.error('[submitMultipleScannedProducts] Product submission failed:', error)
      results.push({
        success: false,
        productId: '',
        storeProductCreated: false,
        batchId: '',
        message: error instanceof Error ? error.message : 'Submission failed',
      })
      failureCount++
    }
  }

  console.log('[submitMultipleScannedProducts] Batch completed:', {
    total: products.length,
    successCount,
    failureCount,
  })

  return {
    success: successCount > 0,
    results,
    successCount,
    failureCount,
  }
}
