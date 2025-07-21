import { Database } from '@/types/supabase'
import { SupabaseClient } from '@supabase/supabase-js'

type Store = Database['business']['Tables']['stores']['Row']
type Batch = Database['inventory']['Tables']['batches']['Row']
type Product = Database['inventory']['Tables']['products']['Row']
type GlobalProduct = Database['global']['Tables']['products']['Row']
type StoreProduct = Database['business']['Tables']['store_product']['Row']

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
  // GLOBAL PRODUCTS OPERATIONS
  // =============================================

  async findGlobalProductByBarcode(barcode: string): Promise<GlobalProduct | null> {
    try {
      const { data, error } = await this.supabase
        .schema('global')
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null
        }
        console.error('Error finding global product by barcode:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in findGlobalProductByBarcode:', error)
      return null
    }
  }

  async searchGlobalProducts(
    searchTerm: string,
    storeId?: string,
    limit: number = 20
  ): Promise<GlobalProduct[]> {
    try {
      let query = this.supabase
        .schema('global')
        .from('products')
        .select(`
          *,
          store_products:business.store_product(
            default_cost_price,
            default_selling_price,
            is_active
          )
        `)
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,barcode.eq.${searchTerm}`)
        .limit(limit)

      if (storeId) {
        query = query.eq('store_products.store_id', storeId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error searching global products:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in searchGlobalProducts:', error)
      return []
    }
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
    try {
      const { data, error } = await this.supabase
        .schema('global')
        .from('products')
        .insert({
          ...productData,
          verification_status: 'pending',
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating global product:', error)
        throw error
      }

      console.log('Global product created successfully:', data.product_id)
      return data
    } catch (error) {
      console.error('Error in createGlobalProduct:', error)
      throw error
    }
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
    userId: string
  ): Promise<StoreProduct> {
    try {
      const { data, error } = await this.supabase
        .schema('business')
        .from('store_product')
        .insert({
          store_id: storeId,
          product_id: productId,
          ...pricing,
          added_by: userId,
          updated_by: userId,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding product to store:', error)
        throw error
      }

      console.log('Product added to store successfully:', productId)
      return data
    } catch (error) {
      console.error('Error in addProductToStore:', error)
      throw error
    }
  }

  async getStoreProducts(
    storeId: string,
    options: {
      page?: number
      limit?: number
      category?: string
      active_only?: boolean
    } = {}
  ): Promise<{ data: any[]; count: number }> {
    const { page = 1, limit = 50, category, active_only = true } = options

    try {
      let query = this.supabase
        .schema('business')
        .from('store_product')
        .select(`
          *,
          global_product:global.products(*)
        `, { count: 'exact' })
        .eq('store_id', storeId)

      if (active_only) {
        query = query.eq('is_active', true)
      }

      if (category) {
        query = query.eq('global_product.primary_category', category)
      }

      const offset = (page - 1) * limit
      const { data, error, count } = await query.range(offset, offset + limit - 1)

      if (error) {
        console.error('Error fetching store products:', error)
        throw error
      }

      return { data: data || [], count: count || 0 }
    } catch (error) {
      console.error('Error in getStoreProducts:', error)
      return { data: [], count: 0 }
    }
  }

  async createBatchWithGlobalProduct(
    batchData: {
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
    }
  ): Promise<Batch> {
    try {
      const { data, error } = await this.supabase
        .schema('inventory')
        .from('batches')
        .insert({
          ...batchData,
          inherited_from_store_product: !batchData.cost_price || !batchData.selling_price,
          status: 'active',
          verification_status: 'verified',
          received_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating batch with global product:', error)
        throw error
      }

      console.log('Batch created with global product successfully:', data.batch_id)
      return data
    } catch (error) {
      console.error('Error in createBatchWithGlobalProduct:', error)
      throw error
    }
  }

  async processCsvBatch(
    csvData: any[],
    storeId: string,
    userId: string,
  ): Promise<{ processed: number; errors: string[] }> {
    // Validate store access
    const hasAccess = await this.validateStoreAccess(storeId, userId, 'staff')
    if (!hasAccess) {
      throw new Error('Unauthorized: No access to this store')
    }

    const errors: string[] = []
    let processed = 0

    for (const row of csvData) {
      try {
        let globalProduct: GlobalProduct | null = null
        
        // Try to find global product by barcode first
        if (row.Barcode) {
          globalProduct = await this.findGlobalProductByBarcode(row.Barcode)
        }
        
        // If not found by barcode, search by name
        if (!globalProduct && row.Product_Name) {
          const searchResults = await this.searchGlobalProducts(row.Product_Name, storeId, 1)
          if (searchResults.length > 0) {
            globalProduct = searchResults[0]
          }
        }
        
        // If no global product found, create one
        if (!globalProduct) {
          globalProduct = await this.createGlobalProduct({
            name: row.Product_Name,
            brand: row.Brand,
            barcode: row.Barcode,
            primary_category: row.Category || 'dry_goods',
            typical_shelf_life_days: this.calculateShelfLife(row.Category || 'dry_goods'),
            unit_type: row.Unit_Type || 'pcs',
            created_by: userId,
          })
        }
        
        // Check if product is already in store catalog
        const { data: existingStoreProduct } = await this.supabase
          .schema('business')
          .from('store_product')
          .select('*')
          .eq('store_id', storeId)
          .eq('product_id', globalProduct.product_id)
          .single()
        
        // Add product to store if not already there
        if (!existingStoreProduct) {
          await this.addProductToStore(
            storeId,
            globalProduct.product_id,
            {
              default_cost_price: parseFloat(row.Cost_Price),
              default_selling_price: parseFloat(row.Selling_Price),
              store_specific_sku: row.SKU,
              supplier_code: row.Supplier_Code,
            },
            userId
          )
        }
        
        // Create batch with global product reference
        await this.createBatchWithGlobalProduct({
          global_product_id: globalProduct.product_id,
          store_id: storeId,
          batch_number: row.Batch_Number || `${row.SKU || globalProduct.name}-${new Date().getTime()}`,
          expiry_date: row.Expiry_Date,
          manufacture_date: row.Manufacture_Date || new Date().toISOString().split('T')[0],
          initial_quantity: parseFloat(row.Quantity),
          current_quantity: parseFloat(row.Quantity),
          cost_price: row.Cost_Price ? parseFloat(row.Cost_Price) : undefined,
          selling_price: row.Selling_Price ? parseFloat(row.Selling_Price) : undefined,
          location_code: row.Location || 'MAIN',
          batch_source: 'import',
          barcode_scanned: row.Barcode,
          created_by: userId,
        })

        processed++
      } catch (error) {
        errors.push(
          `Row ${csvData.indexOf(row) + 1}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    return { processed, errors }
  }

  async getStoreInventoryAlerts(storeId: string, threshold: number = 0.6): Promise<any[]> {
    const { data, error } = await this.supabase
      .schema('inventory')
      .from('batches_with_products')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'active')
      .gte('product_scores.composite_score', threshold)
      .order('product_scores.composite_score', { ascending: false })

    if (error) {
      console.error('Error fetching inventory alerts:', error)
      throw error
    }

    return data || []
  }

  async getStoreInventory(
    storeId: string,
    options: {
      page?: number
      limit?: number
      category?: string
      status?: string
    } = {},
  ): Promise<{ data: any[]; count: number }> {
    const { page = 1, limit = 50, category, status = 'active' } = options

    let query = this.supabase
      .schema('inventory')
      .from('batches_with_products')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId)
      .eq('status', status)
      .order('expiry_date', { ascending: true })

    if (category) {
      query = query.eq('product_category', category)
    }

    const offset = (page - 1) * limit
    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching store inventory:', error)
      throw error
    }

    return { data: data || [], count: count || 0 }
  }

  async updateBatchQuantity(batchId: string, newQuantity: number, userId: string): Promise<void> {
    const { error } = await this.supabase
      .schema('inventory')
      .from('batches')
      .update({
        current_quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq('batch_id', batchId)

    if (error) {
      console.error('Error updating batch quantity:', error)
      throw error
    }
  }

  async applyDiscount(batchId: string, discountPercent: number, userId: string): Promise<void> {
    // Get current batch data
    const { data: batch, error: fetchError } = await this.supabase
      .schema('inventory')
      .from('batches')
      .select('selling_price, store_id')
      .eq('batch_id', batchId)
      .single()

    if (fetchError) {
      console.error('Error fetching batch for discount:', fetchError)
      throw fetchError
    }

    const originalPrice = batch.selling_price
    const newPrice = originalPrice * (1 - discountPercent / 100)

    // Update batch price
    const { error: updateError } = await this.supabase
      .schema('inventory')
      .from('batches')
      .update({
        selling_price: newPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('batch_id', batchId)

    if (updateError) {
      console.error('Error applying discount:', updateError)
      throw updateError
    }

    // Log action
    const { error: actionError } = await this.supabase
      .schema('analytics')
      .from('actions')
      .insert({
        batch_id: batchId,
        store_id: batch.store_id,
        action_type: discountPercent >= 30 ? 'discount_aggressive' : 'discount_moderate',
        original_price: originalPrice,
        new_price: newPrice,
        discount_percent: discountPercent,
        executed_by: userId,
      })

    if (actionError) {
      console.error('Error logging discount action:', actionError)
      // Don't throw - discount was applied successfully
    }
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
    const [
      { count: totalProducts },
      { count: totalBatches },
      { count: activeAlerts },
      { data: valueData },
    ] = await Promise.all([
      this.supabase
        .schema('inventory')
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId),

      this.supabase
        .schema('scoring')
        .from('product_scores')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .gte('composite_score', 0.6),

      this.supabase
        .schema('inventory')
        .from('batches')
        .select('current_quantity, selling_price')
        .eq('store_id', storeId)
        .eq('status', 'active'),

      this.supabase
        .schema('inventory')
        .from('batches')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('status', 'active')
        .lte(
          'expiry_date',
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        ),
    ])

    const totalValue =
      valueData?.reduce((sum, batch) => sum + batch.current_quantity * batch.selling_price, 0) || 0

    return {
      totalProducts: totalProducts || 0,
      totalBatches: totalBatches || 0,
      activeAlerts: activeAlerts || 0,
      totalValue,
      expiringItems: 0,
    }
  }
}
