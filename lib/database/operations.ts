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

  async processCsvBatch(
    csvData: unknown[],
    storeId: string,
    userId: string,
  ): Promise<{ processed: number; errors: string[] }> {
    const errors: string[] = []
    let processed = 0

    console.log('[processCsvBatch] Processing', csvData.length, 'items for store', storeId)

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
            `[processCsvBatch] Skipping duplicate batch for ${csvItem.SKU} with expiry ${csvItem.Expiry_Date}`,
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
        console.log('[processCsvBatch] Successfully created batch:', batch.batch_id)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        errors.push(`Unexpected error processing item: ${errorMessage}`)
        console.error('[processCsvBatch] Unexpected error:', error)
      }
    }

    console.log('[processCsvBatch] Completed:', { processed, errors: errors.length })
    return { processed, errors }
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
