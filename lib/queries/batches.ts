// lib/queries/batches.ts

import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

// Type for the server client (it's a Promise!)
type ServerClient = Awaited<ReturnType<typeof createServerClient>>

// Type for a batch row with potential product relationship
export type Batch = Database['inventory']['Tables']['batches']['Row']
export type BatchWithProduct = Batch & {
  products?: Database['inventory']['Tables']['products']['Row']
}

// Enhanced batch filters for various business scenarios
export type BatchFilters = {
  product_id?: string
  status?: 'active' | 'expired' | 'damaged' | 'sold_out' | 'reserved'
  location_code?: string
  supplier?: string
  expiringInDays?: number // Batches expiring within X days
  hasStock?: boolean // Only batches with current_quantity > 0
  // Future store filtering
  store_id?: string
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

// ✅ FETCH ALL BATCHES (for overview/analytics)
export async function fetchBatches(serverClient?: ServerClient): Promise<Batch[]> {
  const supabase = serverClient || createClient()
  console.log('[fetchBatches] Querying inventory.batches with no filters')

  try {
    const { data, error } = await supabase.schema('inventory').from('batches').select('*')

    if (error) {
      console.error('[fetchBatches] Supabase error:', error)
      throw new Error(`Failed to fetch batches: ${error.message}`)
    }

    console.log('[fetchBatches] Success:', { count: data?.length })
    return data as Batch[]
  } catch (err) {
    console.error('[fetchBatches] Unexpected error:', err)
    throw err
  }
}

// ✅ PAGINATED BATCHES WITH FILTERS (main listing)
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
    // Build query with product relationship
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

    // Apply filters
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

    // Future: Store filtering
    // if (filters.store_id) {
    //   query = query.eq('store_id', filters.store_id)
    // }

    const rangeFrom = page * pageSize
    const rangeTo = (page + 1) * pageSize - 1
    console.log('[fetchBatchesPage] Pagination:', { page, pageSize, rangeFrom, rangeTo })

    const { data, error, count } = await query
      .order('expiry_date', { ascending: true }) // Show expiring batches first
      .range(rangeFrom, rangeTo)

    if (error) {
      console.error('[fetchBatchesPage] Supabase error:', error)
      throw new Error(`Failed to fetch batches page: ${error.message}`)
    }

    console.log('[fetchBatchesPage] Success:', {
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

// ✅ GET BATCHES FOR A SPECIFIC PRODUCT
export async function fetchBatchesForProduct(
  productId: string,
  { page, pageSize }: BatchesPageParam,
  filters: Omit<BatchFilters, 'product_id'> = {},
  serverClient?: ServerClient,
): Promise<{
  data: Batch[]
  count: number
  nextPage: number | undefined
}> {
  return fetchBatchesPage({ page, pageSize }, { ...filters, product_id: productId }, serverClient)
}

// ✅ CRUD OPERATIONS
export async function createBatch(
  batchData: Database['inventory']['Tables']['batches']['Insert'],
): Promise<Batch> {
  const supabase = createClient()

  try {
    console.log('[createBatch] Creating batch:', {
      batch_number: batchData.batch_number,
      product_id: batchData.product_id,
    })

    // Validate that product exists
    const { data: product, error: productError } = await supabase
      .schema('inventory')
      .from('products')
      .select('product_id')
      .eq('product_id', batchData.product_id)
      .single()

    if (productError || !product) {
      throw new Error(`Product with ID "${batchData.product_id}" not found`)
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

    console.log('[createBatch] Success:', { batchId: data.batch_id })
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

    // TODO: Check for related transactions/sales first
    // const { data: relatedTransactions, error: transactionError } = await supabase
    //   .schema('transactions')
    //   .from('sales')
    //   .select('sale_id')
    //   .eq('batch_id', batchId)
    //   .limit(1)

    // if (relatedTransactions && relatedTransactions.length > 0) {
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

// ✅ BUSINESS LOGIC HELPERS
export async function fetchExpiringBatches(
  daysAhead: number = 7,
  serverClient?: ServerClient,
): Promise<BatchWithProduct[]> {
  const supabase = serverClient || createClient()

  try {
    const expiryThreshold = new Date()
    expiryThreshold.setDate(expiryThreshold.getDate() + daysAhead)

    console.log('[fetchExpiringBatches] Fetching batches expiring within days:', {
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
      .eq('status', 'active')
      .gt('current_quantity', 0)
      .lte('expiry_date', expiryThreshold.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true })

    if (error) {
      console.error('[fetchExpiringBatches] Supabase error:', error)
      throw new Error(`Failed to fetch expiring batches: ${error.message}`)
    }

    console.log('[fetchExpiringBatches] Success:', { count: data?.length })
    return data as BatchWithProduct[]
  } catch (err) {
    console.error('[fetchExpiringBatches] Unexpected error:', err)
    throw err
  }
}

export async function fetchLowStockBatches(
  thresholdQuantity: number = 10,
  serverClient?: ServerClient,
): Promise<BatchWithProduct[]> {
  const supabase = serverClient || createClient()

  try {
    console.log('[fetchLowStockBatches] Fetching low stock batches:', { thresholdQuantity })

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
      .eq('status', 'active')
      .gt('current_quantity', 0)
      .lte('current_quantity', thresholdQuantity)
      .order('current_quantity', { ascending: true })

    if (error) {
      console.error('[fetchLowStockBatches] Supabase error:', error)
      throw new Error(`Failed to fetch low stock batches: ${error.message}`)
    }

    console.log('[fetchLowStockBatches] Success:', { count: data?.length })
    return data as BatchWithProduct[]
  } catch (err) {
    console.error('[fetchLowStockBatches] Unexpected error:', err)
    throw err
  }
}

// ✅ FUTURE: Store-specific queries for when you implement stores
// export async function fetchBatchesForStore(
//   storeId: string,
//   { page, pageSize }: BatchesPageParam,
//   filters: Omit<BatchFilters, 'store_id'> = {},
//   serverClient?: ServerClient,
// ): Promise<{
//   data: BatchWithProduct[]
//   count: number
//   nextPage: number | undefined
// }> {
//   return fetchBatchesPage(
//     { page, pageSize },
//     { ...filters, store_id: storeId },
//     serverClient
//   )
// }
