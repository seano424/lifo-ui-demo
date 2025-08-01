/* eslint-disable @typescript-eslint/no-unused-vars */
import { Database } from '@/types/supabase'
import { SupabaseClient } from '@supabase/supabase-js'

type Store = Database['business']['Tables']['stores']['Row']
type Batch = Database['inventory']['Tables']['batches']['Row']

type GlobalProduct = Database['inventory']['Tables']['products']['Row']
type StoreProduct = Database['inventory']['Tables']['store_products']['Row']

export class InventoryOperations {
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient
  }

  async validateStoreAccess(
    storeId: string,
    userId: string,
    requiredRole: string = 'staff',
  ): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('user_has_store_access', {
      target_store_id: storeId,
      required_role: requiredRole,
    })

    if (error) {
      console.error('Error validating store access:', error)
      return false
    }

    return data || false
  }

  async getUserStores(userId: string): Promise<Store[]> {
    try {
      // Temporary workaround: Get stores by owner_id to avoid RLS policy recursion
      // This will be replaced once RLS policies are properly configured
      const { data: stores, error: storesError } = await this.supabase
        .schema('business')
        .from('stores')
        .select('*')
        .eq('owner_id', userId)
        .eq('is_active', true)

      if (storesError) {
        console.error('Error fetching stores:', storesError)
        // Return empty array to allow creating new store
        return []
      }

      return stores || []
    } catch (error) {
      console.error('Error in getUserStores:', error)
      return []
    }
  }

  async createStore(storeData: Partial<Store>, ownerId: string): Promise<Store> {
    try {
      const { data, error } = await this.supabase
        .schema('business')
        .from('stores')
        .insert({
          ...storeData,
          owner_id: ownerId,
          is_active: true,
          store_code: storeData.store_code ?? 'DEFAULT_CODE',
          store_name: storeData.store_name ?? 'Untitled Store',
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating store:', error)
        throw error
      }

      // Add owner to store_users table
      const { error: storeUserError } = await this.supabase
        .schema('business')
        .from('store_users')
        .insert({
          store_id: data.store_id,
          user_id: ownerId,
          role_in_store: 'owner',
          permissions: {
            can_upload_inventory: true,
            can_apply_discounts: true,
            can_view_analytics: true,
          },
          assigned_by: ownerId,
        })

      if (storeUserError) {
        console.error('Error adding owner to store_users:', storeUserError)
        // Continue despite this error - owner_id field in stores table provides fallback
      }

      console.log('Store created successfully:', data.store_id)

      return data
    } catch (error) {
      console.error('Error in createStore:', error)
      throw error
    }
  }

  // =============================================
  // GLOBAL PRODUCTS OPERATIONS - NORMALIZED SCHEMA
  // =============================================

  async findGlobalProductByBarcode(barcode: string): Promise<GlobalProduct | null> {
    const { data, error } = await this.supabase
      .schema('inventory')
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - product not found
        return null
      }
      throw new Error(`Error finding product by barcode: ${error.message}`)
    }

    return data
  }

  async searchGlobalProducts(
    searchTerm: string,
    storeId?: string,
    limit: number = 20,
  ): Promise<GlobalProduct[]> {
    // If storeId provided, only show products available in that store
    if (storeId) {
      const { data, error } = await this.supabase
        .schema('inventory')
        .from('products')
        .select(
          `
          *,
          store_products!inner (
            store_id,
            is_active
          )
        `,
        )
        .or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
        .eq('store_products.store_id', storeId)
        .eq('store_products.is_active', true)
        .limit(limit)

      if (error) {
        throw new Error(`Error searching global products: ${error.message}`)
      }

      return data || []
    }

    // Default search without store filtering
    const { data, error } = await this.supabase
      .schema('inventory')
      .from('products')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
      .limit(limit)

    if (error) {
      throw new Error(`Error searching global products: ${error.message}`)
    }

    return data || []
  }

  async createGlobalProduct(productData: {
    name: string
    brand?: string
    barcode?: string
    primary_category: string
    typical_shelf_life_days?: number
    unit_type?: string
    created_by: string
  }): Promise<GlobalProduct> {
    const { data, error } = await this.supabase
      .schema('inventory')
      .from('products')
      .insert({
        name: productData.name,
        brand: productData.brand,
        barcode: productData.barcode,
        category: productData.primary_category,
        typical_shelf_life_days: productData.typical_shelf_life_days || 30,
        unit_type: productData.unit_type || 'pcs',
        created_by: productData.created_by,
        sku: `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique SKU
        base_cost_price: 0, // Required field - set default
        base_selling_price: 0, // Required field - set default
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Error creating global product: ${error.message}`)
    }

    return data
  }

  async addProductToStore(
    storeId: string,
    productId: string,
    pricing: {
      default_cost_price: number
      default_selling_price: number
      store_specific_sku?: string
      supplier_code?: string
    },
    userId: string,
  ): Promise<StoreProduct> {
    const { data, error } = await this.supabase
      .schema('inventory')
      .from('store_products')
      .insert({
        store_id: storeId,
        product_id: productId,
        cost_price: pricing.default_cost_price,
        selling_price: pricing.default_selling_price,
        store_sku: pricing.store_specific_sku,
        supplier_code: pricing.supplier_code,
        added_by: userId,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Error adding product to store: ${error.message}`)
    }

    return data
  }

  async getStoreProducts(
    storeId: string,
    options: {
      page?: number
      limit?: number
      category?: string
      active_only?: boolean
    } = {},
  ): Promise<{ data: StoreProduct[]; count: number }> {
    const { page = 1, limit = 50, category, active_only = true } = options
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = this.supabase
      .schema('inventory')
      .from('store_products')
      .select(
        `
        *,
        products (
          product_id,
          name,
          brand,
          category,
          barcode,
          unit_type,
          typical_shelf_life_days
        )
      `,
        { count: 'exact' },
      )
      .eq('store_id', storeId)
      .range(from, to)

    if (active_only) {
      query = query.eq('is_active', true)
    }

    if (category) {
      query = query.eq('products.category', category)
    }

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Error getting store products: ${error.message}`)
    }

    return { data: data || [], count: count || 0 }
  }

  async createBatchWithGlobalProduct(batchData: {
    global_product_id: string
    store_id: string
    batch_number: string
    expiry_date: string
    manufacture_date?: string
    initial_quantity: number
    current_quantity: number
    cost_price?: number
    selling_price?: number
    location_code?: string
    batch_source?: string
    barcode_scanned?: string
    created_by: string
  }): Promise<Batch> {
    // TODO: Re-enable when global schema is ready
    console.warn('Global products functionality temporarily disabled')
    throw new Error('Global products functionality temporarily disabled')
  }

  // BULK OPERATIONS FOR PERFORMANCE

  // Test if bulk RPC functions are available
  async testBulkFunctionAvailability(): Promise<{ available: string[]; missing: string[] }> {
    console.log('🔍 [DB-OPS] Testing bulk RPC function availability...')

    const available: string[] = []
    const missing: string[] = []

    // Test check_bulk_duplicates
    try {
      await (
        this.supabase.rpc as unknown as (
          name: string,
          params: Record<string, unknown>,
        ) => Promise<unknown>
      )('check_bulk_duplicates', {
        p_barcodes: [],
        p_expiry_dates: [],
        p_store_id: 'test',
      })
      available.push('check_bulk_duplicates')
      console.log('✅ [DB-OPS] check_bulk_duplicates function is available')
    } catch (error: unknown) {
      missing.push('check_bulk_duplicates')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ [DB-OPS] check_bulk_duplicates function missing:', errorMessage)
    }

    // Test bulk_insert_csv_batches_with_store_link
    try {
      await (
        this.supabase.rpc as unknown as (
          name: string,
          params: Record<string, unknown>,
        ) => Promise<unknown>
      )('bulk_insert_csv_batches_with_store_link', {
        p_store_id: 'test',
        p_created_by: 'test',
        p_data: [],
      })
      available.push('bulk_insert_csv_batches_with_store_link')
      console.log('✅ [DB-OPS] bulk_insert_csv_batches_with_store_link function is available')
    } catch (error: unknown) {
      missing.push('bulk_insert_csv_batches_with_store_link')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(
        '❌ [DB-OPS] bulk_insert_csv_batches_with_store_link function missing:',
        errorMessage,
      )
    }

    return { available, missing }
  }

  async checkBulkDuplicates(
    barcodes: string[],
    expiryDates: string[],
    storeId: string,
  ): Promise<
    Array<{
      sku: string
      expiry_date: string
      batch_id: string
      batch_number: string
      current_quantity: number
      is_duplicate: boolean
    }>
  > {
    console.log('🔍 [DB-OPS] === BULK DUPLICATE CHECK STARTED ===')
    console.log(`🔍 [DB-OPS] Checking ${barcodes.length} items for duplicates in store: ${storeId}`)

    const duplicateCheckStart = performance.now()

    console.log('📊 [DB-OPS] Sample parameters:', {
      first_3_barcodes: barcodes.slice(0, 3),
      first_3_expiry_dates: expiryDates.slice(0, 3),
      store_id: storeId,
      total_items: barcodes.length,
    })

    // Fixed parameter order: barcodes, expiry_dates, store_id
    console.log('📞 [DB-OPS] Calling Supabase RPC: check_bulk_duplicates')
    const { data, error } = await (
      this.supabase.rpc as unknown as (
        name: string,
        params: Record<string, unknown>,
      ) => Promise<{
        data: unknown
        error: { message: string; code?: string; details?: string; hint?: string } | null
      }>
    )('check_bulk_duplicates', {
      p_barcodes: barcodes,
      p_expiry_dates: expiryDates,
      p_store_id: storeId, // Move store_id to last parameter
    })

    const duplicateCheckEnd = performance.now()
    const duplicateCheckTime = duplicateCheckEnd - duplicateCheckStart

    if (error) {
      console.error('❌ [DB-OPS] Bulk duplicate check RPC failed:', error)
      console.error('❌ [DB-OPS] RPC Error Details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      throw new Error(`Bulk duplicate check failed: ${error.message}`)
    }

    const duplicateCount = Array.isArray(data) ? data.length : 0
    console.log(`✅ [DB-OPS] Bulk duplicate check completed in ${Math.round(duplicateCheckTime)}ms`)
    console.log(`📊 [DB-OPS] Found ${duplicateCount} duplicate items`)

    if (duplicateCount > 0 && duplicateCount <= 5 && Array.isArray(data)) {
      console.log('🔍 [DB-OPS] Sample duplicates found:', data.slice(0, 3))
    }

    return Array.isArray(data) ? data : []
  }

  // ADD this new method to handle store product linking
  async ensureProductInStore(
    storeId: string,
    productId: string,
    costPrice?: number,
    sellingPrice?: number,
    storeSku?: string,
  ): Promise<void> {
    const { error } = await (
      this.supabase.rpc as unknown as (
        name: string,
        params: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>
    )('add_product_to_store_safely', {
      p_store_id: storeId,
      p_product_id: productId,
      p_cost_price: costPrice,
      p_selling_price: sellingPrice,
      p_store_sku: storeSku,
    })

    if (error) {
      throw new Error(`Failed to link product to store: ${error.message}`)
    }
  }

  async resolveBulkProductsSimple(
    skus: string[],
    barcodes: string[],
    names: string[],
  ): Promise<
    Array<{
      sku: string
      product_id: string
      name: string
      created: boolean
    }>
  > {
    const { data, error } = await (
      this.supabase.rpc as unknown as (
        name: string,
        params: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>
    )('resolve_bulk_products_simple', {
      skus,
      barcodes,
      names,
    })

    if (error) {
      console.error('Bulk product resolution failed:', error)
      throw new Error(`Bulk product resolution failed: ${error.message}`)
    }

    return Array.isArray(data) ? data : []
  }

  // ENHANCED bulk insert method with complete product lifecycle:
  async insertBatchesBulk(
    storeId: string,
    userId: string,
    batchData: Array<{
      sku: string
      product_name: string
      brand?: string
      category?: string
      quantity: number
      expiry_date: string
      cost_price?: number
      selling_price?: number
      manufacture_date?: string
      location?: string
      unit_type?: string
      batch_number?: string
    }>,
  ): Promise<{
    inserted_count: number
    products_created: number
    store_products_linked: number
    batch_ids: string[]
    processing_time_ms: number
  }> {
    console.log('💾 [DB-OPS] === ENHANCED BULK BATCH INSERT STARTED ===')
    console.log(`💾 [DB-OPS] Inserting ${batchData.length} batches for store: ${storeId}`)

    const insertStartTime = performance.now()

    console.log('📦 [DB-OPS] Sample batch data (first 2 items):')
    batchData.slice(0, 2).forEach((item, index) => {
      console.log(`   Batch ${index + 1}:`, {
        sku: item.sku,
        product_name: item.product_name,
        quantity: item.quantity,
        expiry_date: item.expiry_date,
        cost_price: item.cost_price,
      })
    })

    console.log('📞 [DB-OPS] Calling enhanced RPC: bulk_insert_csv_batches_with_store_link')
    console.log(
      '🔐 [DB-OPS] This function handles: product creation + store linking + batch insertion',
    )

    // Use the enhanced function that handles complete product lifecycle
    const { data, error } = await (
      this.supabase.rpc as unknown as (
        name: string,
        params: Record<string, unknown>,
      ) => Promise<{
        data: unknown
        error: { message: string; code?: string; details?: string; hint?: string } | null
      }>
    )('bulk_insert_csv_batches_with_store_link', {
      p_store_id: storeId,
      p_created_by: userId,
      p_data: batchData,
    })

    const insertEndTime = performance.now()
    const insertTime = insertEndTime - insertStartTime

    if (error) {
      console.error('❌ [DB-OPS] Enhanced bulk insert RPC failed:', error)
      console.error('❌ [DB-OPS] RPC Error Details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      throw new Error(`Enhanced bulk insert failed: ${error.message}`)
    }

    const result = Array.isArray(data) && data.length > 0 ? data[0] : data
    console.log(`✅ [DB-OPS] Enhanced bulk insert completed in ${Math.round(insertTime)}ms`)
    console.log('📊 [DB-OPS] Enhanced insert results:', {
      inserted_count: result?.inserted_count || 0,
      products_created: result?.products_created || 0,
      store_products_linked: result?.store_products_linked || 0,
      batch_ids_count: result?.batch_ids?.length || 0,
      database_processing_time_ms: result?.processing_time_ms || 0,
    })

    return result // Returns { inserted_count, batch_ids, processing_time_ms, store_products_linked, products_created }
  }

  async processCsvBatch(
    csvData: unknown[],
    storeId: string,
    userId: string,
  ): Promise<{
    processed: number
    errors: string[]
    duplicates_skipped: Array<{
      sku: string
      product_name: string
      expiry_date: string
      reason: string
    }>
    performance_metrics?: {
      items_per_second: number
      duplicate_detection_ms: number
      product_resolution_ms: number
      batch_insertion_ms: number
      total_time_ms: number
      store_products_linked: number
      products_created: number
      database_processing_time_ms: number
    }
  }> {
    const processingStartTime = Date.now()
    console.log('🚀 [DB-OPS] ========= BULK CSV PROCESSING STARTED =========')
    console.log(
      `🚀 [DB-OPS] Processing ${csvData.length} items for store: ${storeId}, user: ${userId}`,
    )
    console.log('🚀 [DB-OPS] Bulk optimization: ENABLED')

    try {
      // Test function availability first
      console.log('🔍 [DB-OPS] Step 0: Testing bulk function availability...')
      const functionTest = await this.testBulkFunctionAvailability()

      if (functionTest.missing.length > 0) {
        console.error('🚫 [DB-OPS] Missing required bulk functions:', functionTest.missing)
        console.log('🔄 [DB-OPS] Falling back to individual processing due to missing functions')
        return this.processCsvBatchIndividual(csvData, storeId, userId)
      } else {
        console.log('✅ [DB-OPS] All bulk functions are available:', functionTest.available)
      }
      // Prepare CSV items
      console.log('📋 [DB-OPS] Step 1: Preparing CSV items for processing...')
      const prepStartTime = performance.now()

      const csvItems = csvData.map(item => {
        const csvItem = item as {
          SKU: string
          Product_Name: string
          Category: string
          Quantity: number
          Expiry_Date: string
          Brand: string
          Cost_Price: number
          Selling_Price: number
          Manufacture_Date: string
          Location: string
          Unit_Type: string
          Batch_Number: string
        }
        return csvItem
      })

      const prepEndTime = performance.now()
      console.log(`✅ [DB-OPS] CSV items prepared in ${Math.round(prepEndTime - prepStartTime)}ms`)

      // Step 1: Bulk duplicate check (FIXED parameter order)
      console.log('🔍 [DB-OPS] Step 2: Starting bulk duplicate detection...')
      const duplicateCheckStart = Date.now()

      const duplicateResults = await this.checkBulkDuplicates(
        csvItems.map(item => item.SKU || ''), // barcodes first
        csvItems.map(item => item.Expiry_Date), // expiry_dates second
        storeId, // store_id last
      )
      const duplicateCheckTime = Date.now() - duplicateCheckStart

      // Step 2: Filter non-duplicates
      console.log('🔄 [DB-OPS] Step 3: Filtering non-duplicate items...')
      const filterStartTime = performance.now()

      const nonDuplicates = csvItems.filter((_, index) => {
        const dupResult = duplicateResults[index]
        return !dupResult?.is_duplicate
      })

      const filterEndTime = performance.now()
      console.log(
        `✅ [DB-OPS] Filtering completed in ${Math.round(filterEndTime - filterStartTime)}ms`,
      )
      console.log(
        `📊 [DB-OPS] Items breakdown: ${csvItems.length} total, ${nonDuplicates.length} non-duplicates, ${csvItems.length - nonDuplicates.length} duplicates`,
      )

      // Step 3: Prepare batch data for bulk insert
      console.log('📦 [DB-OPS] Step 4: Preparing batch data for bulk insert...')
      const batchPrepStart = performance.now()

      const batchData = nonDuplicates.map((csvItem, index) => ({
        sku: csvItem.SKU || `AUTO-${Date.now()}-${index}`,
        product_name: csvItem.Product_Name,
        brand: csvItem.Brand,
        category: csvItem.Category,
        quantity: csvItem.Quantity,
        expiry_date: csvItem.Expiry_Date,
        cost_price: csvItem.Cost_Price || 0,
        selling_price: csvItem.Selling_Price || 0,
        manufacture_date: csvItem.Manufacture_Date || undefined,
        location: csvItem.Location || 'MAIN',
        unit_type: csvItem.Unit_Type || 'units',
        batch_number: csvItem.Batch_Number || `CSV-${Date.now()}-${index}`,
        typical_shelf_life_days: this.calculateShelfLifeFromCategory(csvItem.Category),
      }))

      const batchPrepEnd = performance.now()
      console.log(
        `✅ [DB-OPS] Batch data prepared in ${Math.round(batchPrepEnd - batchPrepStart)}ms`,
      )

      // Step 4: Bulk insert (handles store product linking automatically)
      console.log('💾 [DB-OPS] Step 5: Starting bulk batch insertion...')
      const batchInsertStart = Date.now()

      let insertResult = null
      if (batchData.length > 0) {
        insertResult = await this.insertBatchesBulk(storeId, userId, batchData)
      } else {
        console.log('⚠️ [DB-OPS] No items to insert (all were duplicates)')
      }

      const batchInsertTime = Date.now() - batchInsertStart
      const totalTime = Date.now() - processingStartTime

      console.log('🎉 [DB-OPS] ========= BULK CSV PROCESSING COMPLETED =========')
      console.log(`⚡ [DB-OPS] Total processing time: ${totalTime}ms`)
      console.log('📊 [DB-OPS] Final processing summary:', {
        total_items: csvData.length,
        processed: insertResult?.inserted_count || 0,
        duplicates_skipped: csvData.length - nonDuplicates.length,
        success_rate: `${Math.round(((insertResult?.inserted_count || 0) / csvData.length) * 100)}%`,
        items_per_second: Math.round(((insertResult?.inserted_count || 0) / totalTime) * 1000),
        store_products_linked: insertResult?.store_products_linked || 0,
      })

      return {
        processed: insertResult?.inserted_count || 0,
        errors: [],
        duplicates_skipped: duplicateResults
          .filter((dup, index) => dup?.is_duplicate)
          .map((dup, index) => ({
            sku: csvItems[index]?.SKU || '',
            product_name: csvItems[index]?.Product_Name || '',
            expiry_date: csvItems[index]?.Expiry_Date || '',
            reason: 'Duplicate detected',
          })),
        performance_metrics: {
          items_per_second: Math.round(((insertResult?.inserted_count || 0) / totalTime) * 1000),
          duplicate_detection_ms: duplicateCheckTime,
          product_resolution_ms: 0, // Handled within bulk insert
          batch_insertion_ms: batchInsertTime,
          total_time_ms: totalTime,
          store_products_linked: insertResult?.store_products_linked || 0,
          products_created: insertResult?.products_created || 0,
          database_processing_time_ms: totalTime,
        },
      }
    } catch (error) {
      const errorTime = Date.now() - processingStartTime
      console.error('💥 [DB-OPS] ========= BULK PROCESSING FAILED =========')
      console.error(`💥 [DB-OPS] Error occurred after ${errorTime}ms`)
      console.error('💥 [DB-OPS] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : 'No stack',
        timestamp: new Date().toISOString(),
      })

      // Check if it's an RPC function error
      if (error instanceof Error && error.message.includes('could not find function')) {
        console.error('🚫 [DB-OPS] RPC FUNCTION NOT FOUND - Database functions may not be deployed')
        console.error(
          '🚫 [DB-OPS] Expected functions: check_bulk_duplicates, bulk_insert_csv_batches_with_store_link',
        )
      } else if (error instanceof Error && error.message.includes('permission denied')) {
        console.error('🔒 [DB-OPS] PERMISSION DENIED - RLS policies may be blocking access')
      }

      // Fallback to individual processing if bulk operations fail
      console.log('🔄 [DB-OPS] Attempting fallback to individual processing...')
      console.log('⚠️ [DB-OPS] Note: Individual processing will be slower but should work')
      return this.processCsvBatchIndividual(csvData, storeId, userId)
    }
  }

  // Keep original method as fallback
  private async processCsvBatchIndividual(
    csvData: unknown[],
    storeId: string,
    userId: string,
  ): Promise<{
    processed: number
    errors: string[]
    duplicates_skipped: Array<{
      sku: string
      product_name: string
      expiry_date: string
      reason: string
    }>
  }> {
    const errors: string[] = []
    let processed = 0

    console.log('🔄 [DB-OPS] ========= INDIVIDUAL PROCESSING STARTED =========')
    console.log(`🔄 [DB-OPS] Processing ${csvData.length} items individually for store: ${storeId}`)
    console.log('⚠️ [DB-OPS] Note: This is slower than bulk processing but more compatible')

    for (const item of csvData) {
      try {
        const csvItem = item as {
          SKU: string
          Product_Name: string
          Category: string
          Quantity: number
          Expiry_Date: string
          Brand: string
          Cost_Price: number
          Selling_Price: number
          Manufacture_Date: string
          Location: string
          Unit_Type: string
          Batch_Number: string
        }

        // Create/find product first (search by SKU if available, otherwise by name+brand)
        let existingProduct = null
        let productError = null

        if (csvItem.SKU) {
          const result = await this.supabase
            .schema('inventory')
            .from('products')
            .select('product_id')
            .eq('sku', csvItem.SKU)
            .single()
          existingProduct = result.data
          productError = result.error
        }

        // If no SKU match, try name+brand
        if (!existingProduct && !productError) {
          const result = await this.supabase
            .schema('inventory')
            .from('products')
            .select('product_id')
            .eq('name', csvItem.Product_Name)
            .eq('brand', csvItem.Brand)
            .single()
          existingProduct = result.data
          productError = result.error
        }

        let productId: string

        if (existingProduct) {
          productId = existingProduct.product_id
        } else {
          // Create new global product
          const { data: newProduct, error: createProductError } = await this.supabase
            .schema('inventory')
            .from('products')
            .insert({
              sku: csvItem.SKU || `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: csvItem.Product_Name,
              brand: csvItem.Brand,
              category: csvItem.Category,
              unit_type: csvItem.Unit_Type || 'units',
              typical_shelf_life_days: this.calculateShelfLifeFromCategory(csvItem.Category),
              base_cost_price: csvItem.Cost_Price || 0,
              base_selling_price: csvItem.Selling_Price || 0,
              created_by: userId,
            })
            .select('product_id')
            .single()

          if (createProductError || !newProduct) {
            errors.push(
              `Failed to create product "${csvItem.Product_Name}": ${createProductError?.message}`,
            )
            continue
          }
          productId = newProduct.product_id
        }

        // Ensure product is available in store
        const { error: storeProductError } = await this.supabase
          .schema('inventory')
          .from('store_products')
          .upsert({
            store_id: storeId,
            product_id: productId,
            selling_price: csvItem.Selling_Price,
            cost_price: csvItem.Cost_Price,
            is_active: true,
            added_by: userId,
          })

        if (storeProductError) {
          errors.push(`Failed to link product to store: ${storeProductError.message}`)
          continue
        }

        // Check for existing batches with same SKU and expiry date (simple duplicate detection)
        const { data: existingBatches, error: duplicateCheckError } = await this.supabase
          .schema('inventory')
          .from('batches')
          .select('batch_id')
          .eq('store_id', storeId)
          .eq('product_id', productId)
          .eq('expiry_date', csvItem.Expiry_Date)
          .eq('status', 'active')
          .limit(1)

        if (!duplicateCheckError && existingBatches && existingBatches.length > 0) {
          console.log(
            `[processCsvBatchIndividual] Skipping duplicate batch for ${csvItem.SKU} with expiry ${csvItem.Expiry_Date}`,
          )
          // Skip this item - it's a duplicate batch
          continue
        }

        // Create batch (either no duplicate or ADD_ANYWAY action)
        const { data: batch, error: batchError } = await this.supabase
          .schema('inventory')
          .from('batches')
          .insert({
            store_id: storeId,
            product_id: productId,
            batch_number: csvItem.Batch_Number || `CSV-${Date.now()}-${processed}`,
            initial_quantity: csvItem.Quantity,
            current_quantity: csvItem.Quantity,
            cost_price: csvItem.Cost_Price,
            selling_price: csvItem.Selling_Price,
            manufacture_date: csvItem.Manufacture_Date || null,
            expiry_date: csvItem.Expiry_Date,
            location_code: csvItem.Location || 'MAIN',
            batch_source: 'csv_import',
            status: 'active',
            created_by: userId,
          })
          .select()
          .single()

        if (batchError) {
          errors.push(`Failed to create batch for "${csvItem.Product_Name}": ${batchError.message}`)
          continue
        }

        processed++
        console.log('[processCsvBatchIndividual] Successfully created batch:', batch.batch_id)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        errors.push(`Unexpected error processing item: ${errorMessage}`)
        console.error('[processCsvBatchIndividual] Unexpected error:', error)
      }
    }

    console.log('[processCsvBatchIndividual] Completed:', { processed, errors: errors.length })
    return { processed, errors, duplicates_skipped: [] }
  }

  private calculateShelfLifeFromCategory(category?: string): number {
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

  async getStoreInventoryAlerts(storeId: string, threshold: number = 0.6): Promise<unknown[]> {
    // TODO: Re-enable when scoring system is ready
    console.warn('Inventory alerts functionality temporarily disabled')
    return []
  }

  async getStoreInventory(
    storeId: string,
    options: {
      page?: number
      limit?: number
      category?: string
      status?: string
    } = {},
  ): Promise<{ data: Batch[]; count: number }> {
    // TODO: Re-enable when inventory system is ready
    console.warn('Inventory functionality temporarily disabled')
    return { data: [], count: 0 }
  }

  async updateBatchQuantity(batchId: string, newQuantity: number, userId: string): Promise<void> {
    // TODO: Re-enable when inventory system is ready
    console.warn('Inventory functionality temporarily disabled')
    throw new Error('Inventory functionality temporarily disabled')
  }

  async applyDiscount(batchId: string, discountPercent: number, userId: string): Promise<void> {
    // TODO: Re-enable when inventory system is ready
    console.warn('Inventory functionality temporarily disabled')
    throw new Error('Inventory functionality temporarily disabled')
  }

  private calculateShelfLife(category: string): number {
    const shelfLifeMap: Record<string, number> = {
      fresh_produce: 3,
      fresh_meat_fish: 2,
      bakery_fresh: 2,
      dairy: 7,
      deli_prepared: 3,
      frozen: 90,
      chilled_packaged: 14,
      pantry_staples: 365,
      canned_jarred: 730,
      dry_goods: 180,
      beverages: 365,
      spices_condiments: 730,
    }

    return shelfLifeMap[category] || 30
  }

  async getStoreStats(storeId: string): Promise<{
    totalProducts: number
    totalBatches: number
    activeAlerts: number
    totalValue: number
    expiringItems: number
  }> {
    // TODO: Re-enable when all systems are ready
    console.warn('Store stats functionality temporarily disabled')
    return {
      totalProducts: 0,
      totalBatches: 0,
      activeAlerts: 0,
      totalValue: 0,
      expiringItems: 0,
    }
  }
}
