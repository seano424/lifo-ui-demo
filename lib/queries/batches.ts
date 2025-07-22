// lib/queries/batches.ts

import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

// Type for the server client (it's a Promise!)
type ServerClient = Awaited<ReturnType<typeof createServerClient>>

// Type for a batch row
export type Batch = Database['inventory']['Tables']['batches']['Row']

// Type for batch with product relationship
export type BatchWithProduct = Batch & {
  products?: Database['inventory']['Tables']['products']['Row']
}

// Enhanced sorting types for batches
export type BatchSortField =
  | 'batch_number'
  | 'supplier'
  | 'manufacture_date'
  | 'expiry_date'
  | 'received_date'
  | 'current_quantity'
  | 'cost_price'
  | 'selling_price'
  | 'status'
  | 'created_at'

export type BatchSortDirection = 'asc' | 'desc'

export type BatchSort = {
  field: BatchSortField
  direction: BatchSortDirection
}

// Enhanced batch filters for store-aware usage
export type BatchFilters = {
  storeId?: string // ✅ STORE FILTER ADDED
  product_id?: string
  status?: 'active' | 'expired' | 'damaged' | 'sold_out' | 'reserved'
  location_code?: string
  supplier?: string
  expiringInDays?: number // Batches expiring within X days
  hasStock?: boolean // Only batches with current_quantity > 0
  sort?: BatchSort
  // Date range filtering
  expiry_date_from?: string
  expiry_date_to?: string
  received_date_from?: string
  received_date_to?: string
}

export type BatchesPageParam = {
  page: number
  pageSize: number
}

// ✅ FIXED: Simple single-column ordering compatible with PostgREST
function applySingleColumnSort(query: any, sort?: BatchSort): any {
  if (!sort) {
    // Default: soonest expiry first for batch management
    return query.order('expiry_date', { ascending: true })
  }

  // ✅ SIMPLE: One order() call only - PostgREST compatible
  switch (sort.field) {
    case 'expiry_date':
      return query.order('expiry_date', { ascending: sort.direction === 'asc' })
    case 'current_quantity':
      return query.order('current_quantity', { ascending: sort.direction === 'asc' })
    case 'cost_price':
      return query.order('cost_price', { ascending: sort.direction === 'asc' })
    case 'selling_price':
      return query.order('selling_price', { ascending: sort.direction === 'asc' })
    case 'received_date':
      return query.order('received_date', { ascending: sort.direction === 'asc' })
    case 'manufacture_date':
      return query.order('manufacture_date', { ascending: sort.direction === 'asc' })
    case 'batch_number':
      return query.order('batch_number', { ascending: sort.direction === 'asc' })
    case 'supplier':
      return query.order('supplier', { ascending: sort.direction === 'asc' })
    case 'status':
      return query.order('status', { ascending: sort.direction === 'asc' })
    case 'created_at':
      return query.order('created_at', { ascending: sort.direction === 'asc' })
    default:
      // Fallback to expiry date
      return query.order('expiry_date', { ascending: true })
  }
}

// ✅ FIXED: Separate fetch approach to avoid complex joins that break PostgREST
async function fetchBatchesWithProducts(
  batches: Batch[],
  supabase: SupabaseClient<Database>,
): Promise<BatchWithProduct[]> {
  if (batches.length === 0) return []

  // Get unique product IDs
  const productIds = [...new Set(batches.map(b => b.product_id))]

  // Fetch products separately - simple query
  const { data: products, error: productsError } = await supabase
    .schema('inventory')
    .from('products')
    .select('*')
    .in('product_id', productIds)

  if (productsError) {
    console.warn('[fetchBatchesWithProducts] Failed to fetch products:', productsError)
    // Return batches without product data instead of failing
    return batches.map(batch => ({ ...batch, products: undefined }))
  }

  // Map products to batches
  return batches.map(batch => {
    const product = products?.find(p => p.product_id === batch.product_id)
    return {
      ...batch,
      products: product || undefined,
    }
  })
}

// ✅ STORE-AWARE: Paginated batches with filters - FIXED VERSION
export async function fetchBatchesPage(
  { page, pageSize }: BatchesPageParam,
  filters: BatchFilters = {},
  serverClient?: ServerClient,
): Promise<{
  data: BatchWithProduct[]
  count: number
  nextPage: number | undefined
}> {
  const supabase = serverClient || createClient()

  try {
    // ✅ MANDATORY STORE FILTER
    if (!filters.storeId) {
      throw new Error('Store ID is required for fetching batches')
    }

    console.log('[fetchBatchesPage] Applying store filter:', filters.storeId)

    // ✅ SIMPLE: Build query for batches only (no nested select to avoid PostgREST issues)
    let query = supabase
      .schema('inventory')
      .from('batches')
      .select('*', { count: 'exact' })
      .eq('store_id', filters.storeId)

    // Apply filters one by one
    if (filters.product_id) {
      console.log('[fetchBatchesPage] Applying product_id filter:', filters.product_id)
      query = query.eq('product_id', filters.product_id)
    }

    if (filters.status) {
      console.log('[fetchBatchesPage] Applying status filter:', filters.status)
      query = query.eq('status', filters.status)
    }

    if (filters.location_code) {
      console.log('[fetchBatchesPage] Applying location filter:', filters.location_code)
      query = query.eq('location_code', filters.location_code)
    }

    if (filters.supplier) {
      console.log('[fetchBatchesPage] Applying supplier filter:', filters.supplier)
      query = query.ilike('supplier', `%${filters.supplier}%`)
    }

    if (filters.hasStock) {
      console.log('[fetchBatchesPage] Applying hasStock filter')
      query = query.gt('current_quantity', 0)
    }

    if (filters.expiringInDays) {
      const expiryThreshold = new Date()
      expiryThreshold.setDate(expiryThreshold.getDate() + filters.expiringInDays)
      console.log('[fetchBatchesPage] Applying expiring filter:', {
        days: filters.expiringInDays,
        threshold: expiryThreshold,
      })
      query = query.lte('expiry_date', expiryThreshold.toISOString().split('T')[0])
    }

    if (filters.expiry_date_from) {
      query = query.gte('expiry_date', filters.expiry_date_from)
    }

    if (filters.expiry_date_to) {
      query = query.lte('expiry_date', filters.expiry_date_to)
    }

    if (filters.received_date_from) {
      query = query.gte('received_date', filters.received_date_from)
    }

    if (filters.received_date_to) {
      query = query.lte('received_date', filters.received_date_to)
    }

    // ✅ FIXED: Apply single-column sorting compatible with PostgREST
    console.log('[fetchBatchesPage] Applying sort:', {
      field: filters.sort?.field,
      direction: filters.sort?.direction,
    })
    query = applySingleColumnSort(query, filters.sort)

    // Apply pagination
    const rangeFrom = page * pageSize
    const rangeTo = (page + 1) * pageSize - 1
    console.log('[fetchBatchesPage] Pagination:', { page, pageSize, rangeFrom, rangeTo })

    const { data: batches, error, count } = await query.range(rangeFrom, rangeTo)

    if (error) {
      console.error('[fetchBatchesPage] Supabase error:', error)
      throw new Error(`Failed to fetch batches page: ${error.message}`)
    }

    // ✅ FIXED: Fetch products separately to avoid complex join issues
    const batchesWithProducts = await fetchBatchesWithProducts(batches || [], supabase)

    console.log('[fetchBatchesPage] Success:', {
      storeId: filters.storeId,
      dataCount: batchesWithProducts.length,
      totalCount: count,
      hasNextPage: (count || 0) > (page + 1) * pageSize,
    })

    return {
      data: batchesWithProducts,
      count: count || 0,
      nextPage: (count || 0) > (page + 1) * pageSize ? page + 1 : undefined,
    }
  } catch (err) {
    console.error('[fetchBatchesPage] Unexpected error:', err)
    throw err
  }
}

// ✅ STORE-AWARE: Get batches for a specific product in a store
export async function fetchBatchesForProduct(
  productId: string,
  { page, pageSize }: BatchesPageParam,
  filters: Omit<BatchFilters, 'product_id'> = {},
  serverClient?: ServerClient,
): Promise<{
  data: BatchWithProduct[]
  count: number
  nextPage: number | undefined
}> {
  return fetchBatchesPage({ page, pageSize }, { ...filters, product_id: productId }, serverClient)
}

// ✅ CRUD mutations with proper store validation
export async function createBatch(
  batchData: Database['inventory']['Tables']['batches']['Insert'],
): Promise<Batch> {
  const supabase = createClient()

  try {
    // ✅ ENSURE STORE_ID IS PROVIDED
    if (!batchData.store_id) {
      throw new Error('Store ID is required when creating a batch')
    }

    console.log('[createBatch] Creating batch:', {
      storeId: batchData.store_id,
      batch_number: batchData.batch_number,
      product_id: batchData.product_id,
    })

    // ✅ VALIDATE: Product exists (products are global, but validate it exists)
    const { data: product, error: productError } = await supabase
      .schema('inventory')
      .from('products')
      .select('product_id')
      .eq('product_id', batchData.product_id)
      .single()

    if (productError || !product) {
      throw new Error(`Product with ID "${batchData.product_id}" not found`)
    }

    // ✅ VALIDATE: Product is available in this store via store_products junction
    const { data: storeProduct, error: storeProductError } = await supabase
      .schema('inventory')
      .from('store_products')
      .select('product_id')
      .eq('store_id', batchData.store_id)
      .eq('product_id', batchData.product_id)
      .eq('is_active', true)
      .single()

    if (storeProductError || !storeProduct) {
      throw new Error(`Product "${batchData.product_id}" is not available in this store`)
    }

    const { data, error } = await supabase
      .schema('inventory')
      .from('batches')
      .insert(batchData)
      .select()
      .single()

    if (error) {
      console.error('[createBatch] Supabase error:', error)

      // Handle specific error cases
      if (error.code === '23505') {
        // Unique constraint violation
        throw new Error(`Batch with number "${batchData.batch_number}" already exists`)
      }

      throw new Error(`Failed to create batch: ${error.message}`)
    }

    console.log('[createBatch] Success:', {
      batchId: data.batch_id,
      storeId: data.store_id,
    })
    return data as Batch
  } catch (err) {
    console.error('[createBatch] Unexpected error:', err)
    throw err
  }
}

export async function updateBatch(
  batchId: string,
  updates: Database['inventory']['Tables']['batches']['Update'],
): Promise<Batch> {
  const supabase = createClient()

  try {
    console.log('[updateBatch] Updating batch:', { batchId, updates })

    // Add updated_at timestamp
    const updateWithTimestamp = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .schema('inventory')
      .from('batches')
      .update(updateWithTimestamp)
      .eq('batch_id', batchId)
      .select()
      .single()

    if (error) {
      console.error('[updateBatch] Supabase error:', error)

      // Handle specific error cases
      if (error.code === 'PGRST116') {
        // No rows updated
        throw new Error(`Batch with ID "${batchId}" not found`)
      }

      if (error.code === '23514') {
        // Check constraint violation
        throw new Error('Invalid batch data: check quantities and prices are positive')
      }

      throw new Error(`Failed to update batch: ${error.message}`)
    }

    console.log('[updateBatch] Success:', { batchId })
    return data as Batch
  } catch (err) {
    console.error('[updateBatch] Unexpected error:', err)
    throw err
  }
}

export async function deleteBatch(batchId: string): Promise<void> {
  const supabase = createClient()

  try {
    console.log('[deleteBatch] Deleting batch:', { batchId })

    const { error } = await supabase
      .schema('inventory')
      .from('batches')
      .delete()
      .eq('batch_id', batchId)

    if (error) {
      console.error('[deleteBatch] Supabase error:', error)
      throw new Error(`Failed to delete batch: ${error.message}`)
    }

    console.log('[deleteBatch] Success:', { batchId })
  } catch (err) {
    console.error('[deleteBatch] Unexpected error:', err)
    throw err
  }
}

// ✅ FIXED: Single batch fetch with product (separate queries)
export async function fetchBatchById(
  batchId: string,
  serverClient?: ServerClient,
): Promise<BatchWithProduct> {
  const supabase = serverClient || createClient()

  try {
    console.log('[fetchBatchById] Fetching batch:', { batchId })

    // Fetch batch first
    const { data: batch, error } = await supabase
      .schema('inventory')
      .from('batches')
      .select('*')
      .eq('batch_id', batchId)
      .single()

    if (error) {
      console.error('[fetchBatchById] Supabase error:', error)

      if (error.code === 'PGRST116') {
        // No rows found
        throw new Error(`Batch with ID "${batchId}" not found`)
      }

      throw new Error(`Failed to fetch batch: ${error.message}`)
    }

    // Fetch product separately
    const { data: product } = await supabase
      .schema('inventory')
      .from('products')
      .select('*')
      .eq('product_id', batch.product_id)
      .single()

    const batchWithProduct: BatchWithProduct = {
      ...batch,
      products: product || undefined,
    }

    console.log('[fetchBatchById] Success:', { batchId })
    return batchWithProduct
  } catch (err) {
    console.error('[fetchBatchById] Unexpected error:', err)
    throw err
  }
}

// ✅ STORE-AWARE: Business logic helpers - FIXED with simple ordering
export async function fetchExpiringBatches(
  storeId: string,
  daysAhead: number = 7,
  serverClient?: ServerClient,
): Promise<BatchWithProduct[]> {
  const supabase = serverClient || createClient()

  try {
    const expiryThreshold = new Date()
    expiryThreshold.setDate(expiryThreshold.getDate() + daysAhead)

    console.log('[fetchExpiringBatches] Fetching batches expiring within days:', {
      storeId,
      daysAhead,
      threshold: expiryThreshold,
    })

    // ✅ SIMPLE: Fetch batches first with single-column ordering
    const { data: batches, error } = await supabase
      .schema('inventory')
      .from('batches')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'active')
      .gt('current_quantity', 0)
      .lte('expiry_date', expiryThreshold.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true }) // ✅ Single column sort only

    if (error) {
      console.error('[fetchExpiringBatches] Supabase error:', error)
      throw new Error(`Failed to fetch expiring batches: ${error.message}`)
    }

    // Add products separately
    const batchesWithProducts = await fetchBatchesWithProducts(batches || [], supabase)

    console.log('[fetchExpiringBatches] Success:', { storeId, count: batchesWithProducts.length })
    return batchesWithProducts
  } catch (err) {
    console.error('[fetchExpiringBatches] Unexpected error:', err)
    throw err
  }
}

export async function fetchLowStockBatches(
  storeId: string,
  thresholdQuantity: number = 10,
  serverClient?: ServerClient,
): Promise<BatchWithProduct[]> {
  const supabase = serverClient || createClient()

  try {
    console.log('[fetchLowStockBatches] Fetching low stock batches:', {
      storeId,
      thresholdQuantity,
    })

    // ✅ SIMPLE: Fetch batches first with single-column ordering
    const { data: batches, error } = await supabase
      .schema('inventory')
      .from('batches')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'active')
      .gt('current_quantity', 0)
      .lte('current_quantity', thresholdQuantity)
      .order('current_quantity', { ascending: true }) // ✅ Single column sort only

    if (error) {
      console.error('[fetchLowStockBatches] Supabase error:', error)
      throw new Error(`Failed to fetch low stock batches: ${error.message}`)
    }

    // Add products separately
    const batchesWithProducts = await fetchBatchesWithProducts(batches || [], supabase)

    console.log('[fetchLowStockBatches] Success:', { storeId, count: batchesWithProducts.length })
    return batchesWithProducts
  } catch (err) {
    console.error('[fetchLowStockBatches] Unexpected error:', err)
    throw err
  }
}

// ✅ STORE-AWARE: Convenience function
export async function fetchBatchWithProduct(
  batchId: string,
  serverClient?: ServerClient,
): Promise<BatchWithProduct> {
  return fetchBatchById(batchId, serverClient)
}
