import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

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
    try {
      // First try the RPC function
      const { data, error } = await this.supabase.rpc('user_has_store_access', {
        target_store_id: storeId,
        required_role: requiredRole,
      })

      if (error) {
        console.error('[InventoryOperations.validateStoreAccess] RPC error:', error)

        // Fallback: Check directly in store_users table
        const { data: storeUsers, error: queryError } = await this.supabase
          .schema('business')
          .from('store_users')
          .select('role')
          .eq('store_id', storeId)
          .eq('user_id', userId)
          .eq('is_active', true)
          .single()

        if (queryError) {
          console.error(
            '[InventoryOperations.validateStoreAccess] Fallback query error:',
            queryError,
          )

          // Final fallback: Check if user is store owner
          const { data: store, error: storeError } = await this.supabase
            .schema('business')
            .from('stores')
            .select('owner_id')
            .eq('store_id', storeId)
            .single()

          if (storeError) {
            console.error(
              '[InventoryOperations.validateStoreAccess] Store owner check error:',
              storeError,
            )
            return false
          }

          const isOwner = store?.owner_id === userId

          return isOwner
        }

        const hasAccess = !!storeUsers

        return hasAccess
      }

      return data || false
    } catch (error) {
      console.error('[InventoryOperations.validateStoreAccess] Unexpected error:', error)
      return false
    }
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

  async createStore(storeData: Partial<Store>, _ownerId: string): Promise<Store> {
    try {
      // Use the database function to create the store
      const { data, error } = await this.supabase.schema('business').rpc('create_store_for_user', {
        p_store_name: storeData.store_name ?? 'Untitled Store',
        p_store_code: storeData.store_code ?? 'DEFAULT_CODE',
        p_store_type: storeData.store_type || undefined,
        p_address: storeData.address || undefined,
        p_city: storeData.city || undefined,
        p_postal_code: storeData.postal_code || undefined,
        p_country: storeData.country || 'France',
        p_business_name: storeData.business_name || undefined,
        p_phone: storeData.phone || undefined,
        p_size_category: storeData.size_category || undefined,
        p_timezone: storeData.timezone || 'Europe/Paris',
      })

      if (error) {
        console.error('Database function error:', error)
        throw new Error(`Failed to create store: ${error.message}`)
      }

      if (!data) {
        throw new Error('Store creation failed: No data returned')
      }

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
    // Resolve category to UUID first
    const category_id = await this.resolveCategoryToUuid(productData.primary_category)

    const { data, error } = await this.supabase
      .schema('inventory')
      .from('products')
      .insert({
        name: productData.name,
        brand: productData.brand,
        barcode: productData.barcode,
        category_id: category_id, // Use category_id instead of category
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

  async createBatchWithGlobalProduct(_batchData: {
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
    const _duplicateCheckStart = performance.now()

    // Fixed parameter order: barcodes, expiry_dates, store_id
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

    const _duplicateCheckEnd = performance.now()

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

  // Category resolution method for new database schema
  async resolveCategoryToUuid(categoryName: string): Promise<string> {
    try {
      // Map common category names to your actual database categories
      const categoryMapping: Record<string, string> = {
        // Dairy & Eggs
        dairy: 'dairy_eggs',
        eggs: 'eggs',
        milk: 'milk',
        cheese: 'cheese',
        yogurt: 'yogurt',
        butter: 'butter_spreads',
        spreads: 'butter_spreads',

        // Meat & Seafood
        meat: 'fresh_meat',
        beef: 'fresh_meat',
        pork: 'fresh_meat',
        lamb: 'fresh_meat',
        poultry: 'fresh_poultry',
        chicken: 'fresh_poultry',
        turkey: 'fresh_poultry',
        fish: 'fresh_fish_seafood',
        seafood: 'fresh_fish_seafood',
        salmon: 'fresh_fish_seafood',
        processed_meat: 'processed_meat',
        sausage: 'processed_meat',
        deli: 'deli_prepared',

        // Fresh Produce
        vegetables: 'vegetables',
        fruits: 'fruits',
        produce: 'fresh_produce',
        fresh: 'fresh_produce',
        herbs: 'herbs_aromatics',
        aromatics: 'herbs_aromatics',

        // Bakery
        bread: 'bakery_fresh',
        bakery: 'bakery_fresh',
        baked: 'bakery_fresh',

        // Pantry & Dry Goods
        pasta: 'dry_goods',
        rice: 'dry_goods',
        grains: 'dry_goods',
        flour: 'dry_goods',
        canned: 'canned_jarred',
        jarred: 'canned_jarred',
        dry: 'dry_goods',
        pantry: 'pantry_staples',
        staples: 'pantry_staples',

        // Other Categories
        frozen: 'frozen_foods',
        beverage: 'beverages',
        beverages: 'beverages',
        drinks: 'beverages',
        snacks: 'snacks_confectionery',
        candy: 'snacks_confectionery',
        confectionery: 'snacks_confectionery',
        health: 'health_beauty',
        beauty: 'health_beauty',
        household: 'household_other',
        cleaning: 'household_other',
        other: 'household_other',
        spices: 'spices_condiments',
        condiments: 'spices_condiments',
        chilled: 'chilled_packaged',
        packaged: 'chilled_packaged',
      }

      const normalizedCategory = categoryName.toLowerCase().trim()
      const mappedCategory = categoryMapping[normalizedCategory] || 'dry_goods'

      // Query the categories table to get the UUID
      const { data, error } = await this.supabase
        .schema('inventory')
        .from('categories')
        .select('category_id')
        .eq('category_code', mappedCategory)
        .single()

      if (error || !data) {
        console.warn(`Category '${categoryName}' not found, falling back to dry_goods`)

        // Fallback to dry_goods category
        const { data: fallbackData, error: fallbackError } = await this.supabase
          .schema('inventory')
          .from('categories')
          .select('category_id')
          .eq('category_code', 'dry_goods')
          .single()

        if (fallbackError || !fallbackData) {
          throw new Error(`Failed to resolve category: ${fallbackError?.message}`)
        }

        return fallbackData.category_id
      }

      return data.category_id
    } catch (error) {
      console.error(`Error resolving category '${categoryName}':`, error)
      throw new Error(
        `Category resolution failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
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
    const _insertStartTime = performance.now()

    // STEP 1: Resolve categories to UUIDs for new database schema
    const enrichedBatchData = await Promise.all(
      batchData.map(async item => {
        const category_id = await this.resolveCategoryToUuid(item.category || 'dry_goods')
        return {
          ...item,
          category_id, // Add UUID for new schema
        }
      }),
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
      p_data: enrichedBatchData,
    })

    const _insertEndTime = performance.now()

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

    try {
      // TEMPORARY: Force individual processing until RPC functions are updated for new schema
      console.warn('🔄 [DB-OPS] Using individual processing mode due to schema migration')
      return this.processCsvBatchIndividual(csvData, storeId, userId)
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
    performance_metrics: {
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
    const errors: string[] = []
    let processed = 0

    console.log(`🔍 [DB-OPS] Starting individual processing for ${csvData.length} items`)

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
          // Create new global product with proper category_id
          const category_id = await this.resolveCategoryToUuid(csvItem.Category || 'dry_goods')

          const { data: newProduct, error: createProductError } = await this.supabase
            .schema('inventory')
            .from('products')
            .insert({
              sku: csvItem.SKU || `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: csvItem.Product_Name,
              brand: csvItem.Brand,
              category_id: category_id, // Use category_id with UUID
              unit_type: csvItem.Unit_Type || 'units',
              typical_shelf_life_days: 30, // Will be determined from database category mapping
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
          // Skip this item - it's a duplicate batch
          continue
        }

        // Create batch (either no duplicate or ADD_ANYWAY action)
        const { data: _batch, error: batchError } = await this.supabase
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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        errors.push(`Unexpected error processing item: ${errorMessage}`)
        console.error('[processCsvBatchIndividual] Unexpected error:', error)
      }
    }

    return {
      processed,
      errors,
      duplicates_skipped: [],
      performance_metrics: {
        items_per_second: processed > 0 ? Math.round((processed / 1000) * 1000) : 0,
        duplicate_detection_ms: 0,
        product_resolution_ms: 0,
        batch_insertion_ms: 0,
        total_time_ms: 0,
        store_products_linked: processed,
        products_created: processed,
        database_processing_time_ms: 0,
      },
    }
  }

  async getStoreInventoryAlerts(_storeId: string, _threshold: number = 0.6): Promise<unknown[]> {
    // TODO: Re-enable when scoring system is ready
    console.warn('Inventory alerts functionality temporarily disabled')
    return []
  }

  async getStoreInventory(
    _storeId: string,
    _options: {
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

  async updateBatchQuantity(
    _batchId: string,
    _newQuantity: number,
    _userId: string,
  ): Promise<void> {
    // TODO: Re-enable when inventory system is ready
    console.warn('Inventory functionality temporarily disabled')
    throw new Error('Inventory functionality temporarily disabled')
  }

  async applyDiscount(_batchId: string, _discountPercent: number, _userId: string): Promise<void> {
    // TODO: Re-enable when inventory system is ready
    console.warn('Inventory functionality temporarily disabled')
    throw new Error('Inventory functionality temporarily disabled')
  }

  async getStoreStats(
    storeId: string,
    threshold: number = 0.7,
  ): Promise<{
    totalProducts: number
    totalBatches: number
    activeAlerts: number
    totalValue: number
    expiringItems: number
  }> {
    try {
      // Get total store products
      const { count: productCount, error: productError } = await this.supabase
        .schema('inventory')
        .from('store_products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('is_active', true)

      if (productError) {
        console.error('[getStoreStats] Error counting products:', productError)
      }

      // Get active batches and their values
      const { data: batches, error: batchError } = await this.supabase
        .schema('inventory')
        .from('batches')
        .select(`
          current_quantity, 
          selling_price, 
          expiry_date,
          store_products!inner (
            products (
              category,
              name
            )
          )
        `)
        .eq('store_id', storeId)
        .eq('status', 'active')

      if (batchError) {
        console.error('[getStoreStats] Error fetching batches:', batchError)

        // Alternative query without JOIN to debug
        const { data: _simpleBatches, error: simpleError } = await this.supabase
          .schema('inventory')
          .from('batches')
          .select('current_quantity, selling_price, expiry_date')
          .eq('store_id', storeId)
          .eq('status', 'active')

        if (simpleError) {
          console.error('[getStoreStats] Simple query also failed:', simpleError)
        }
      }

      // Calculate total value
      const totalValue =
        batches?.reduce((sum, batch) => {
          return sum + (batch.current_quantity || 0) * (batch.selling_price || 0)
        }, 0) || 0

      // Calculate expiring items (expiring within 3 days)
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
      const expiringItems =
        batches?.filter(batch => {
          const expiryDate = new Date(batch.expiry_date)
          return expiryDate <= threeDaysFromNow
        }).length || 0

      // Get high urgency items from scoring schema (for activeAlerts)
      const { data: urgentItems, error: urgentError } = await this.supabase
        .schema('scoring')
        .from('product_scores')
        .select('*', { count: 'exact' })
        .eq('store_id', storeId)
        .gte('composite_score', threshold)

      if (urgentError) {
        console.error('[getStoreStats] Error fetching urgent items:', urgentError)
      }

      const stats = {
        totalProducts: productCount || 0,
        totalBatches: batches?.length || 0,
        activeAlerts: urgentItems?.length || 0,
        totalValue: Math.round(totalValue * 100) / 100,
        expiringItems,
      }

      return stats
    } catch (error) {
      console.error('[InventoryOperations.getStoreStats] Unexpected error:', error)
      return {
        totalProducts: 0,
        totalBatches: 0,
        activeAlerts: 0,
        totalValue: 0,
        expiringItems: 0,
      }
    }
  }
}
