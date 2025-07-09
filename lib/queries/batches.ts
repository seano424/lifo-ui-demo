// lib/queries/batches.ts - Updated with store filtering (following products pattern)

import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

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

// Helper function to build Supabase order clause
function buildBatchOrderClause(sort?: BatchSort): { column: string; ascending: boolean } {
  if (!sort) {
    return { column: 'expiry_date', ascending: true } // Default: soonest expiry first
  }

  // Map sort fields to actual database columns
  const columnMap: Record<BatchSortField, string> = {
    batch_number: 'batch_number',
    supplier: 'supplier',
    manufacture_date: 'manufacture_date',
    expiry_date: 'expiry_date',
    received_date: 'received_date',
    current_quantity: 'current_quantity',
    cost_price: 'cost_price',
    selling_price: 'selling_price',
    status: 'status',
    created_at: 'created_at',
  }

  return {
    column: columnMap[sort.field],
    ascending: sort.direction === 'asc',
  }
}

// ✅ STORE-AWARE: Fetch all batches for a specific store
export async function fetchBatches(
  storeId: string,
  serverClient?: ServerClient,
): Promise<BatchWithProduct[]> {
  const supabase = serverClient || createClient()
  console.log('[fetchBatches] Querying inventory.batches for store:', { storeId })

  try {
    const { data, error } = await supabase
      .schema('inventory')
      .from('batches')
      .select(
        `
        *,
        products (
          product_id,
          name,
          sku,
          category,
          brand,
          unit_type
        )
      `,
      )
      .eq('store_id', storeId) // ✅ STORE FILTER
      .order('expiry_date', { ascending: true })
      .order('batch_id', { ascending: true })

    if (error) {
      console.error('[fetchBatches] Supabase error:', error)
      throw new Error(`Failed to fetch batches: ${error.message}`)
    }

    console.log('[fetchBatches] Success:', { storeId, count: data?.length })
    return data as BatchWithProduct[]
  } catch (err) {
    console.error('[fetchBatches] Unexpected error:', err)
    throw err
  }
}

// ✅ STORE-AWARE: Paginated batches with filters
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
    let query = supabase
      .schema('inventory')
      .from('batches')
      .select(
        `
        *,
        products (
          product_id,
          name,
          sku,
          category,
          brand,
          unit_type
        )
      `,
        { count: 'exact' },
      )

    // ✅ MANDATORY STORE FILTER
    if (!filters.storeId) {
      throw new Error('Store ID is required for fetching batches')
    }

    console.log('[fetchBatchesPage] Applying store filter:', filters.storeId)
    query = query.eq('store_id', filters.storeId)

    // Apply other filters
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

    // Apply sorting
    const orderClause = buildBatchOrderClause(filters.sort)
    console.log('[fetchBatchesPage] Applying sort:', {
      field: filters.sort?.field,
      direction: filters.sort?.direction,
      column: orderClause.column,
      ascending: orderClause.ascending,
    })

    query = query.order(orderClause.column, { ascending: orderClause.ascending })

    // Add secondary sort for consistency (always sort by batch_id as tiebreaker)
    if (orderClause.column !== 'batch_id') {
      query = query.order('batch_id', { ascending: true })
    }

    const rangeFrom = page * pageSize
    const rangeTo = (page + 1) * pageSize - 1
    console.log('[fetchBatchesPage] Pagination:', { page, pageSize, rangeFrom, rangeTo })

    const { data, error, count } = await query.range(rangeFrom, rangeTo)

    if (error) {
      console.error('[fetchBatchesPage] Supabase error:', error)
      throw new Error(`Failed to fetch batches page: ${error.message}`)
    }

    console.log('[fetchBatchesPage] Success:', {
      storeId: filters.storeId,
      dataCount: data?.length,
      totalCount: count,
      hasNextPage: (count || 0) > (page + 1) * pageSize,
    })

    return {
      data: (data as BatchWithProduct[]) || [],
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
  const result = await fetchBatchesPage(
    { page, pageSize },
    { ...filters, product_id: productId },
    serverClient,
  )

  return {
    ...result,
    data: result.data as BatchWithProduct[],
  }
}

// ✅ CRUD mutations (ensure store_id is set)

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

    // Validate that product exists and belongs to the same store
    const { data: product, error: productError } = await supabase
      .schema('inventory')
      .from('products')
      .select('product_id, store_id')
      .eq('product_id', batchData.product_id)
      .eq('store_id', batchData.store_id) // ✅ ENSURE PRODUCT BELONGS TO SAME STORE
      .single()

    if (productError || !product) {
      throw new Error(`Product with ID "${batchData.product_id}" not found in this store`)
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

    // TODO: Check for related transactions/sales first if needed
    // const { data: relatedSales, error: salesError } = await supabase
    //   .schema('timeseries')
    //   .from('sales_events')
    //   .select('sale_id')
    //   .eq('batch_id', batchId)
    //   .limit(1)

    // if (relatedSales && relatedSales.length > 0) {
    //   throw new Error('Cannot delete batch with sales history. Mark as inactive instead.')
    // }

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

export async function fetchBatchById(
  batchId: string,
  serverClient?: ServerClient,
): Promise<BatchWithProduct> {
  const supabase = serverClient || createClient()

  try {
    console.log('[fetchBatchById] Fetching batch:', { batchId })

    const { data, error } = await supabase
      .schema('inventory')
      .from('batches')
      .select(
        `
        *,
        products (
          product_id,
          name,
          sku,
          category,
          brand,
          unit_type,
          base_cost_price,
          base_selling_price
        )
      `,
      )
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

    console.log('[fetchBatchById] Success:', { batchId })
    return data as BatchWithProduct
  } catch (err) {
    console.error('[fetchBatchById] Unexpected error:', err)
    throw err
  }
}

// ✅ STORE-AWARE: Business logic helpers
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

    const { data, error } = await supabase
      .schema('inventory')
      .from('batches')
      .select(
        `
        *,
        products (
          product_id,
          name,
          sku,
          category,
          brand
        )
      `,
      )
      .eq('store_id', storeId) // ✅ STORE FILTER
      .eq('status', 'active')
      .gt('current_quantity', 0)
      .lte('expiry_date', expiryThreshold.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true })
      .order('batch_id', { ascending: true })

    if (error) {
      console.error('[fetchExpiringBatches] Supabase error:', error)
      throw new Error(`Failed to fetch expiring batches: ${error.message}`)
    }

    console.log('[fetchExpiringBatches] Success:', { storeId, count: data?.length })
    return data as BatchWithProduct[]
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

    const { data, error } = await supabase
      .schema('inventory')
      .from('batches')
      .select(
        `
        *,
        products (
          product_id,
          name,
          sku,
          category,
          brand
        )
      `,
      )
      .eq('store_id', storeId) // ✅ STORE FILTER
      .eq('status', 'active')
      .gt('current_quantity', 0)
      .lte('current_quantity', thresholdQuantity)
      .order('current_quantity', { ascending: true })
      .order('batch_id', { ascending: true })

    if (error) {
      console.error('[fetchLowStockBatches] Supabase error:', error)
      throw new Error(`Failed to fetch low stock batches: ${error.message}`)
    }

    console.log('[fetchLowStockBatches] Success:', { storeId, count: data?.length })
    return data as BatchWithProduct[]
  } catch (err) {
    console.error('[fetchLowStockBatches] Unexpected error:', err)
    throw err
  }
}

// ✅ STORE-AWARE: Fetch batch with related product for specific store
export async function fetchBatchWithProduct(
  batchId: string,
  serverClient?: ServerClient,
): Promise<BatchWithProduct> {
  return fetchBatchById(batchId, serverClient)
}
