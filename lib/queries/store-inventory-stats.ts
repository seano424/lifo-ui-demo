/**
 * Store Inventory Stats Queries
 *
 * Queries for the store_inventory_stats view which provides real-time
 * inventory aggregations per store. This replaces client-side calculations
 * that were previously done on denormalized columns in the products table.
 *
 * View includes:
 * - total_stock: Total quantity across all batches (active + draft)
 * - active_batches_count: Count of active batches
 * - incomplete_batches_count: Count of draft batches needing expiry dates
 * - avg_days_to_expiry: Average days until expiry for active batches
 * - earliest_expiry_date: Soonest expiry date among active batches
 * - latest_expiry_date: Latest expiry date among active batches
 * - total_reserved_quantity: Total reserved quantity
 * - available_quantity: Total quantity minus reserved
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase-extended'

type StoreInventoryStats = Database['inventory']['Views']['store_inventory_stats']['Row']

/**
 * Fetch inventory stats for a specific store and product
 */
export async function fetchStoreInventoryStats(
  storeId: string,
  productId?: string,
): Promise<StoreInventoryStats[] | null> {
  const supabase = createClient()

  let query = supabase
    .schema('inventory')
    .from('store_inventory_stats')
    .select('*')
    .eq('store_id', storeId)

  if (productId) {
    query = query.eq('product_id', productId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching store inventory stats:', error)
    return null
  }

  return data
}

/**
 * Fetch inventory stats for a single product in a store
 */
export async function fetchProductInventoryStats(
  storeId: string,
  productId: string,
): Promise<StoreInventoryStats | null> {
  const stats = await fetchStoreInventoryStats(storeId, productId)
  return stats && stats.length > 0 ? stats[0] : null
}

/**
 * Fetch count of incomplete batches (draft batches needing expiry dates)
 * across all products in a store
 */
export async function fetchIncompleteBatchesCount(storeId: string): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase
    .schema('inventory')
    .from('store_inventory_stats')
    .select('incomplete_batches_count')
    .eq('store_id', storeId)

  if (error) {
    console.error('Error fetching incomplete batches count:', error)
    return 0
  }

  // Sum up all incomplete batches across all products
  const totalIncomplete =
    data?.reduce((sum, row) => sum + (row.incomplete_batches_count || 0), 0) || 0

  return totalIncomplete
}

/**
 * Fetch products with inventory stats for a store
 * Joins product data with the inventory stats view
 */
export async function fetchProductsWithStats(
  storeId: string,
  options?: {
    hasIncompleteBatches?: boolean
    hasStock?: boolean
  },
): Promise<unknown[] | null> {
  const supabase = createClient()

  let query = supabase
    .schema('inventory')
    .from('store_inventory_stats')
    .select(`
      *,
      product:products!inner (
        product_id,
        sku,
        name,
        description,
        category_id,
        brand,
        barcode,
        barcode_type,
        typical_shelf_life_days,
        base_cost_price,
        base_selling_price,
        created_at,
        updated_at
      )
    `)
    .eq('store_id', storeId)

  // Filter for products with incomplete batches
  if (options?.hasIncompleteBatches) {
    query = query.gt('incomplete_batches_count', 0)
  }

  // Filter for products with stock
  if (options?.hasStock) {
    query = query.gt('total_stock', 0)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching products with stats:', error)
    return null
  }

  return data
}

/**
 * Fetch products that need expiry dates (have draft batches)
 */
export async function fetchProductsNeedingExpiryDates(storeId: string): Promise<unknown[] | null> {
  return fetchProductsWithStats(storeId, { hasIncompleteBatches: true })
}

/**
 * Get inventory summary stats for a store
 */
export async function fetchStoreSummaryStats(storeId: string): Promise<{
  totalProducts: number
  totalStock: number
  totalValue: number
  incompleteBatches: number
  activeBatches: number
} | null> {
  const stats = await fetchStoreInventoryStats(storeId)

  if (!stats) {
    return null
  }

  const summary = {
    totalProducts: stats.length,
    totalStock: stats.reduce((sum, s) => sum + (s.total_stock || 0), 0),
    totalValue: 0, // Would need price data to calculate
    incompleteBatches: stats.reduce((sum, s) => sum + (s.incomplete_batches_count || 0), 0),
    activeBatches: stats.reduce((sum, s) => sum + (s.active_batches_count || 0), 0),
  }

  return summary
}
