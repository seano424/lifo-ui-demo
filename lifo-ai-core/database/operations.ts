import { Database } from '@/types/supabase'
import { SupabaseClient } from '@supabase/supabase-js'

type Store = Database['business']['Tables']['stores']['Row']
type Batch = Database['inventory']['Tables']['batches']['Row']
type Product = Database['inventory']['Tables']['products']['Row']

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
        // Upsert product
        const productData = {
          sku: row.SKU,
          name: row.Product_Name,
          category: row.Category || 'dry_goods',
          store_id: storeId,
          unit_type: row.Unit_Type || 'pcs',
          typical_shelf_life_days: this.calculateShelfLife(row.Category),
          base_cost_price: parseFloat(row.Cost_Price),
          base_selling_price: parseFloat(row.Selling_Price),
          created_by: userId,
        }

        const { data: product, error: productError } = await this.supabase
          .schema('inventory')
          .from('products')
          .upsert(productData, { onConflict: 'sku' })
          .select()
          .single()

        if (productError) {
          errors.push(
            `Row ${csvData.indexOf(row) + 1}: Failed to create product - ${productError.message}`,
          )
          continue
        }

        // Create batch
        const batchData = {
          product_id: product.product_id,
          store_id: storeId,
          batch_number: row.Batch_Number || `${row.SKU}-${new Date().getTime()}`,
          expiry_date: row.Expiry_Date,
          manufacture_date: row.Manufacture_Date || new Date().toISOString().split('T')[0],
          initial_quantity: parseFloat(row.Quantity),
          current_quantity: parseFloat(row.Quantity),
          cost_price: parseFloat(row.Cost_Price),
          selling_price: parseFloat(row.Selling_Price),
          location_code: row.Location || 'MAIN',
          created_by: userId,
        }

        const { error: batchError } = await this.supabase
          .schema('inventory')
          .from('batches')
          .insert(batchData)

        if (batchError) {
          errors.push(
            `Row ${csvData.indexOf(row) + 1}: Failed to create batch - ${batchError.message}`,
          )
          continue
        }

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
      .from('batches')
      .select(
        `
        *,
        products(*),
        product_scores(*)
      `,
      )
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
      .from('batches')
      .select(
        `
        *,
        products(*),
        product_scores(*)
      `,
        { count: 'exact' },
      )
      .eq('store_id', storeId)
      .eq('status', status)
      .order('expiry_date', { ascending: true })

    if (category) {
      query = query.eq('products.category', category)
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
