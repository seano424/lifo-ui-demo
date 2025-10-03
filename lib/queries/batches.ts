// lib/queries/batches.ts

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'

// Type for the server client (it's a Promise!)
type ServerClient = Awaited<ReturnType<typeof createServerClient>>

// Type for a batch row
export type Batch = Database['inventory']['Tables']['batches']['Row']

// Type for category data that may be attached to products
type CategoryData = {
  category_code?: string
  display_name_en?: string
  display_name_fr?: string
}

// Type for product with potential category information
type ProductWithCategories = Database['inventory']['Tables']['products']['Row'] & {
  categories?: CategoryData
}

// Type for batch with product relationship including category info
export type BatchWithProduct = Batch & {
  products?: Database['inventory']['Tables']['products']['Row'] & {
    category_code?: string
    category_display_name?: string
    category_display_name_fr?: string
  }
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
  storeId?: string
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

function applySingleColumnSort<
  T extends { order: (column: string, options?: { ascending: boolean }) => T },
>(query: T, sort?: BatchSort): T {
  if (!sort) {
    // Default: soonest expiry first for batch management
    return query.order('expiry_date', { ascending: true })
  }

  switch (sort.field) {
    case 'expiry_date':
      return query.order('expiry_date', { ascending: sort.direction === 'asc' })
    case 'current_quantity':
      return query.order('current_quantity', {
        ascending: sort.direction === 'asc',
      })
    case 'cost_price':
      return query.order('cost_price', { ascending: sort.direction === 'asc' })
    case 'selling_price':
      return query.order('selling_price', {
        ascending: sort.direction === 'asc',
      })
    case 'received_date':
      return query.order('received_date', {
        ascending: sort.direction === 'asc',
      })
    case 'manufacture_date':
      return query.order('manufacture_date', {
        ascending: sort.direction === 'asc',
      })
    case 'batch_number':
      return query.order('batch_number', {
        ascending: sort.direction === 'asc',
      })
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

async function fetchBatchesWithProducts(
  batches: Batch[],
  supabase: SupabaseClient<Database>,
): Promise<BatchWithProduct[]> {
  if (batches.length === 0) return []

  const context = 'fetchBatchesWithProducts'

  // Get unique product IDs
  const productIds = [...new Set(batches.map(b => b.product_id))]

  // Fetch products with category information - simple query with join
  const { data: products, error: productsError } = await supabase
    .schema('inventory')
    .from('products')
    .select(
      `
      *,
      categories:category_id (
        category_id,
        category_code,
        display_name_en,
        display_name_fr
      )
    `,
    )
    .in('product_id', productIds)

  if (productsError) {
    logger.warn(context, 'Failed to fetch products for batches', {
      error: productsError.message,
      code: productsError.code,
      productCount: productIds.length,
    })
    // Return batches without product data instead of failing
    return batches.map(batch => ({ ...batch, products: undefined }))
  }

  // Map products to batches, including category information
  return batches.map(batch => {
    const productData = products?.find(p => p.product_id === batch.product_id)

    if (!productData) {
      return { ...batch, products: undefined }
    }

    // Extract category information
    const productWithCategories = productData as ProductWithCategories
    const categoryData = productWithCategories.categories || null

    const productWithCategory = {
      ...productData,
      category_code: categoryData?.category_code,
      category_display_name: categoryData?.display_name_en,
      category_display_name_fr: categoryData?.display_name_fr,
    }

    return {
      ...batch,
      products: productWithCategory,
    }
  })
}

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
  const context = 'fetchBatchesPage'

  return withPerformanceTracking(
    context,
    'Fetch batches page',
    { page, pageSize, storeId: filters.storeId, filterCount: Object.keys(filters).length },
    async () => {
      if (!filters.storeId) {
        logger.error(context, 'Store ID required', { page, pageSize })
        throw new Error('Store ID is required for fetching batches')
      }

      let query = supabase
        .schema('inventory')
        .from('batches')
        .select('*', { count: 'exact' })
        .eq('store_id', filters.storeId)

      // Apply filters one by one
      if (filters.product_id) {
        query = query.eq('product_id', filters.product_id)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.location_code) {
        query = query.eq('location_code', filters.location_code)
      }

      if (filters.supplier) {
        query = query.ilike('supplier', `%${filters.supplier}%`)
      }

      if (filters.hasStock) {
        query = query.gt('current_quantity', 0)
      }

      if (filters.expiringInDays) {
        const expiryThreshold = new Date()
        expiryThreshold.setDate(expiryThreshold.getDate() + filters.expiringInDays)
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

      query = applySingleColumnSort(query, filters.sort)

      // Apply pagination
      const rangeFrom = page * pageSize
      const rangeTo = (page + 1) * pageSize - 1

      const { data: batches, error, count } = await query.range(rangeFrom, rangeTo)

      if (error) {
        logger.error(context, 'Query failed', {
          error: error.message,
          code: error.code,
          storeId: filters.storeId,
          page,
          pageSize,
        })
        throw new Error(`Failed to fetch batches page: ${error.message}`)
      }

      const batchesWithProducts = await fetchBatchesWithProducts(batches || [], supabase)

      logger.log(context, 'Batches fetched successfully', {
        storeId: filters.storeId,
        page,
        batchCount: batchesWithProducts.length,
        totalCount: count || 0,
      })

      return {
        data: batchesWithProducts,
        count: count || 0,
        nextPage: (count || 0) > (page + 1) * pageSize ? page + 1 : undefined,
      }
    },
  )
}

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

export async function createBatch(
  batchData: Database['inventory']['Tables']['batches']['Insert'],
): Promise<Batch> {
  const supabase = createClient()
  const context = 'createBatch'

  return withPerformanceTracking(
    context,
    'Create batch',
    { storeId: batchData.store_id, productId: batchData.product_id },
    async () => {
      if (!batchData.store_id) {
        logger.error(context, 'Store ID required', { productId: batchData.product_id })
        throw new Error('Store ID is required when creating a batch')
      }

      const { data: product, error: productError } = await supabase
        .schema('inventory')
        .from('products')
        .select('product_id')
        .eq('product_id', batchData.product_id)
        .single()

      if (productError || !product) {
        logger.error(context, 'Product not found', {
          productId: batchData.product_id,
          error: productError?.message,
        })
        throw new Error(`Product with ID "${batchData.product_id}" not found`)
      }

      const { data: storeProduct, error: storeProductError } = await supabase
        .schema('inventory')
        .from('store_products')
        .select('product_id')
        .eq('store_id', batchData.store_id)
        .eq('product_id', batchData.product_id)
        .eq('is_active', true)
        .single()

      if (storeProductError || !storeProduct) {
        logger.error(context, 'Product not available in store', {
          storeId: batchData.store_id,
          productId: batchData.product_id,
          error: storeProductError?.message,
        })
        throw new Error(`Product "${batchData.product_id}" is not available in this store`)
      }

      const { data, error } = await supabase
        .schema('inventory')
        .from('batches')
        .insert(batchData)
        .select()
        .single()

      if (error) {
        // Handle specific error cases
        if (error.code === '23505') {
          logger.error(context, 'Duplicate batch number', {
            batchNumber: batchData.batch_number,
            code: error.code,
          })
          throw new Error(`Batch with number "${batchData.batch_number}" already exists`)
        }

        logger.error(context, 'Failed to create batch', {
          error: error.message,
          code: error.code,
          storeId: batchData.store_id,
          productId: batchData.product_id,
        })
        throw new Error(`Failed to create batch: ${error.message}`)
      }

      logger.log(context, 'Batch created successfully', {
        batchId: data.batch_id,
        batchNumber: data.batch_number,
        storeId: data.store_id,
      })

      return data as Batch
    },
  )
}

export async function updateBatch(
  batchId: string,
  updates: Database['inventory']['Tables']['batches']['Update'],
): Promise<Batch> {
  const supabase = createClient()
  const context = 'updateBatch'

  return withPerformanceTracking(context, 'Update batch', { batchId }, async () => {
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
      // Handle specific error cases
      if (error.code === 'PGRST116') {
        logger.error(context, 'Batch not found', { batchId, code: error.code })
        throw new Error(`Batch with ID "${batchId}" not found`)
      }

      if (error.code === '23514') {
        logger.error(context, 'Constraint violation', { batchId, code: error.code })
        throw new Error('Invalid batch data: check quantities and prices are positive')
      }

      logger.error(context, 'Update failed', {
        batchId,
        error: error.message,
        code: error.code,
      })
      throw new Error(`Failed to update batch: ${error.message}`)
    }

    logger.log(context, 'Batch updated successfully', { batchId })

    return data as Batch
  })
}

export async function deleteBatch(batchId: string): Promise<void> {
  const supabase = createClient()
  const context = 'deleteBatch'

  return withPerformanceTracking(context, 'Delete batch', { batchId }, async () => {
    const { error } = await supabase
      .schema('inventory')
      .from('batches')
      .delete()
      .eq('batch_id', batchId)

    if (error) {
      logger.error(context, 'Delete failed', {
        batchId,
        error: error.message,
        code: error.code,
      })
      throw new Error(`Failed to delete batch: ${error.message}`)
    }

    logger.log(context, 'Batch deleted successfully', { batchId })
  })
}

export async function fetchBatchById(
  batchId: string,
  serverClient?: ServerClient,
): Promise<BatchWithProduct> {
  const supabase = serverClient || createClient()
  const context = 'fetchBatchById'

  return withPerformanceTracking(context, 'Fetch batch by ID', { batchId }, async () => {
    // Fetch batch first
    const { data: batch, error } = await supabase
      .schema('inventory')
      .from('batches')
      .select('*')
      .eq('batch_id', batchId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        logger.error(context, 'Batch not found', { batchId, code: error.code })
        throw new Error(`Batch with ID "${batchId}" not found`)
      }

      logger.error(context, 'Query failed', {
        batchId,
        error: error.message,
        code: error.code,
      })
      throw new Error(`Failed to fetch batch: ${error.message}`)
    }

    // Fetch product with category information
    const { data: product } = await supabase
      .schema('inventory')
      .from('products')
      .select(
        `
        *,
        categories:category_id (
          category_id,
          category_code,
          display_name_en,
          display_name_fr
        )
      `,
      )
      .eq('product_id', batch.product_id)
      .single()

    // Transform product data to include category information
    let productWithCategory:
      | (Database['inventory']['Tables']['products']['Row'] & {
          category_code?: string
          category_display_name?: string
          category_display_name_fr?: string
        })
      | undefined
    if (product) {
      const productWithCategories = product as ProductWithCategories
      const categoryData = productWithCategories.categories || null
      productWithCategory = {
        ...product,
        category_code: categoryData?.category_code,
        category_display_name: categoryData?.display_name_en,
        category_display_name_fr: categoryData?.display_name_fr,
      }
    }

    logger.log(context, 'Batch fetched successfully', {
      batchId,
      hasProduct: !!productWithCategory,
    })

    const batchWithProduct: BatchWithProduct = {
      ...batch,
      products: productWithCategory,
    }

    return batchWithProduct
  })
}

export async function fetchExpiringBatches(
  storeId: string,
  daysAhead: number = 7,
  serverClient?: ServerClient,
): Promise<BatchWithProduct[]> {
  const supabase = serverClient || createClient()
  const context = 'fetchExpiringBatches'

  return withPerformanceTracking(
    context,
    'Fetch expiring batches',
    { storeId, daysAhead },
    async () => {
      const expiryThreshold = new Date()
      expiryThreshold.setDate(expiryThreshold.getDate() + daysAhead)

      const { data: batches, error } = await supabase
        .schema('inventory')
        .from('batches')
        .select('*')
        .eq('store_id', storeId)
        .eq('status', 'active')
        .gt('current_quantity', 0)
        .lte('expiry_date', expiryThreshold.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true })

      if (error) {
        logger.error(context, 'Query failed', {
          storeId,
          daysAhead,
          error: error.message,
          code: error.code,
        })
        throw new Error(`Failed to fetch expiring batches: ${error.message}`)
      }

      // Add products separately
      const batchesWithProducts = await fetchBatchesWithProducts(batches || [], supabase)

      logger.log(context, 'Expiring batches fetched successfully', {
        storeId,
        daysAhead,
        batchCount: batchesWithProducts.length,
      })

      return batchesWithProducts
    },
  )
}

export async function fetchLowStockBatches(
  storeId: string,
  thresholdQuantity: number = 10,
  serverClient?: ServerClient,
): Promise<BatchWithProduct[]> {
  const supabase = serverClient || createClient()
  const context = 'fetchLowStockBatches'

  return withPerformanceTracking(
    context,
    'Fetch low stock batches',
    { storeId, thresholdQuantity },
    async () => {
      const { data: batches, error } = await supabase
        .schema('inventory')
        .from('batches')
        .select('*')
        .eq('store_id', storeId)
        .eq('status', 'active')
        .gt('current_quantity', 0)
        .lte('current_quantity', thresholdQuantity)
        .order('current_quantity', { ascending: true })

      if (error) {
        logger.error(context, 'Query failed', {
          storeId,
          thresholdQuantity,
          error: error.message,
          code: error.code,
        })
        throw new Error(`Failed to fetch low stock batches: ${error.message}`)
      }

      // Add products separately
      const batchesWithProducts = await fetchBatchesWithProducts(batches || [], supabase)

      logger.log(context, 'Low stock batches fetched successfully', {
        storeId,
        thresholdQuantity,
        batchCount: batchesWithProducts.length,
      })

      return batchesWithProducts
    },
  )
}

export async function fetchBatchWithProduct(
  batchId: string,
  serverClient?: ServerClient,
): Promise<BatchWithProduct> {
  return fetchBatchById(batchId, serverClient)
}
