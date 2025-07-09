// lib/queries/products.ts - Updated with store filtering

import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { Batch } from './batches'

// Type for the server client (it's a Promise!)
type ServerClient = Awaited<ReturnType<typeof createServerClient>>

// Type for a product row
export type Product = Database['inventory']['Tables']['products']['Row']

// Enhanced sorting types
export type SortField =
  | 'name'
  | 'category'
  | 'brand'
  | 'total_stock'
  | 'base_selling_price'
  | 'active_batches_count'
  | 'created_at'

export type SortDirection = 'asc' | 'desc'

export type ProductSort = {
  field: SortField
  direction: SortDirection
}

// Type for a product filter (enhanced with store and sorting)
export type ProductFilters = {
  storeId?: string // ✅ STORE FILTER ADDED
  category?: Database['inventory']['Tables']['products']['Row']['category']
  brand?: string
  expiringOnly?: boolean
  sort?: ProductSort
  // Add more as needed
}

export type ProductsPageParam = {
  page: number
  pageSize: number
}

// Helper function to build Supabase order clause
function buildOrderClause(sort?: ProductSort): { column: string; ascending: boolean } {
  if (!sort) {
    return { column: 'created_at', ascending: false } // Default: newest first
  }

  // Map sort fields to actual database columns
  const columnMap: Record<SortField, string> = {
    name: 'name',
    category: 'category',
    brand: 'brand',
    total_stock: 'total_stock',
    base_selling_price: 'base_selling_price',
    active_batches_count: 'active_batches_count',
    created_at: 'created_at',
  }

  return {
    column: columnMap[sort.field],
    ascending: sort.direction === 'asc',
  }
}

export async function fetchProducts(
  storeId: string,
  serverClient?: ServerClient,
): Promise<Product[]> {
  const supabase = serverClient || createClient()
  console.log('[fetchProducts] Querying inventory.products for store:', { storeId })

  try {
    const { data, error } = await supabase
      .schema('inventory')
      .from('products')
      .select('*')
      .eq('store_id', storeId) // ✅ STORE FILTER
      .order('created_at', { ascending: false })
      .order('product_id', { ascending: true })

    if (error) {
      console.error('[fetchProducts] Supabase error:', error)
      throw new Error(`Failed to fetch products: ${error.message}`)
    }

    console.log('[fetchProducts] Success:', { storeId, count: data?.length })
    return data as Product[]
  } catch (err) {
    console.error('[fetchProducts] Unexpected error:', err)
    throw err
  }
}

export async function fetchProductsPage(
  { page, pageSize }: ProductsPageParam,
  filters: ProductFilters = {},
  serverClient?: ServerClient,
): Promise<{
  data: Product[]
  count: number
  nextPage: number | undefined
}> {
  const supabase = serverClient || createClient()

  try {
    let query = supabase.schema('inventory').from('products').select('*', { count: 'exact' })

    // ✅ MANDATORY STORE FILTER
    if (!filters.storeId) {
      throw new Error('Store ID is required for fetching products')
    }

    console.log('[fetchProductsPage] Applying store filter:', filters.storeId)
    query = query.eq('store_id', filters.storeId)

    // Apply other filters
    if (filters.category) {
      console.log('[fetchProductsPage] Applying category filter:', filters.category)
      query = query.eq('category', filters.category)
    }

    if (filters.brand) {
      console.log('[fetchProductsPage] Applying brand filter:', filters.brand)
      query = query.eq('brand', filters.brand)
    }

    if (filters.expiringOnly) {
      // Join with batches to find expiring products
      console.log('[fetchProductsPage] Applying expiring filter')
      const expiryThreshold = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      // This is a complex query - for now, we'll fetch all and filter in memory
      // In production, you might want to create a view or use a more complex query
    }

    // Apply sorting
    const orderClause = buildOrderClause(filters.sort)
    console.log('[fetchProductsPage] Applying sort:', {
      field: filters.sort?.field,
      direction: filters.sort?.direction,
      column: orderClause.column,
      ascending: orderClause.ascending,
    })

    query = query.order(orderClause.column, { ascending: orderClause.ascending })

    // Add secondary sort for consistency (always sort by product_id as tiebreaker)
    if (orderClause.column !== 'product_id') {
      query = query.order('product_id', { ascending: true })
    }

    const rangeFrom = page * pageSize
    const rangeTo = (page + 1) * pageSize - 1
    console.log('[fetchProductsPage] Pagination:', { page, pageSize, rangeFrom, rangeTo })

    const { data, error, count } = await query.range(rangeFrom, rangeTo)

    if (error) {
      console.error('[fetchProductsPage] Supabase error:', error)
      throw new Error(`Failed to fetch products page: ${error.message}`)
    }

    console.log('[fetchProductsPage] Success:', {
      storeId: filters.storeId,
      dataCount: data?.length,
      totalCount: count,
      hasNextPage: (count || 0) > (page + 1) * pageSize,
    })

    return {
      data: (data as Product[]) || [],
      count: count || 0,
      nextPage: (count || 0) > (page + 1) * pageSize ? page + 1 : undefined,
    }
  } catch (err) {
    console.error('[fetchProductsPage] Unexpected error:', err)
    throw err
  }
}

// ✅ CRUD mutations remain mostly the same, but ensure store_id is set

export async function createProduct(
  productData: Database['inventory']['Tables']['products']['Insert'],
): Promise<Product> {
  const supabase = createClient()

  try {
    // ✅ ENSURE STORE_ID IS PROVIDED
    if (!productData.store_id) {
      throw new Error('Store ID is required when creating a product')
    }

    console.log('[createProduct] Creating product:', {
      storeId: productData.store_id,
      sku: productData.sku,
      name: productData.name,
    })

    const { data, error } = await supabase
      .schema('inventory')
      .from('products')
      .insert(productData)
      .select()
      .single()

    if (error) {
      console.error('[createProduct] Supabase error:', error)

      // Handle specific error cases
      if (error.code === '23505') {
        // Unique constraint violation
        throw new Error(`Product with SKU "${productData.sku}" already exists`)
      }

      throw new Error(`Failed to create product: ${error.message}`)
    }

    console.log('[createProduct] Success:', {
      productId: data.product_id,
      storeId: data.store_id,
    })
    return data as Product
  } catch (err) {
    console.error('[createProduct] Unexpected error:', err)
    throw err
  }
}

export async function updateProduct(
  productId: string,
  updates: Database['inventory']['Tables']['products']['Update'],
): Promise<Product> {
  const supabase = createClient()

  try {
    console.log('[updateProduct] Updating product:', { productId, updates })

    // Add updated_at timestamp
    const updateWithTimestamp = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .schema('inventory')
      .from('products')
      .update(updateWithTimestamp)
      .eq('product_id', productId)
      .select()
      .single()

    if (error) {
      console.error('[updateProduct] Supabase error:', error)

      // Handle specific error cases
      if (error.code === 'PGRST116') {
        // No rows updated
        throw new Error(`Product with ID "${productId}" not found`)
      }

      if (error.code === '23505') {
        // Unique constraint violation
        throw new Error(`Another product already uses this SKU`)
      }

      throw new Error(`Failed to update product: ${error.message}`)
    }

    console.log('[updateProduct] Success:', { productId })
    return data as Product
  } catch (err) {
    console.error('[updateProduct] Unexpected error:', err)
    throw err
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  const supabase = createClient()

  try {
    console.log('[deleteProduct] Deleting product:', { productId })

    // ✅ Check for related batches first
    const { data: relatedBatches, error: batchError } = await supabase
      .schema('inventory')
      .from('batches')
      .select('batch_id')
      .eq('product_id', productId)
      .limit(1)

    if (batchError) {
      console.error('[deleteProduct] Error checking batches:', batchError)
      throw new Error(`Failed to check related batches: ${batchError.message}`)
    }

    if (relatedBatches && relatedBatches.length > 0) {
      throw new Error('Cannot delete product that has associated batches. Delete batches first.')
    }

    const { error } = await supabase
      .schema('inventory')
      .from('products')
      .delete()
      .eq('product_id', productId)

    if (error) {
      console.error('[deleteProduct] Supabase error:', error)
      throw new Error(`Failed to delete product: ${error.message}`)
    }

    console.log('[deleteProduct] Success:', { productId })
  } catch (err) {
    console.error('[deleteProduct] Unexpected error:', err)
    throw err
  }
}

export async function fetchProductById(
  productId: string,
  serverClient?: ServerClient,
): Promise<Product> {
  const supabase = serverClient || createClient()

  try {
    console.log('[fetchProductById] Fetching product:', { productId })

    const { data, error } = await supabase
      .schema('inventory')
      .from('products')
      .select('*')
      .eq('product_id', productId)
      .single()

    if (error) {
      console.error('[fetchProductById] Supabase error:', error)

      if (error.code === 'PGRST116') {
        // No rows found
        throw new Error(`Product with ID "${productId}" not found`)
      }

      throw new Error(`Failed to fetch product: ${error.message}`)
    }

    console.log('[fetchProductById] Success:', { productId })
    return data as Product
  } catch (err) {
    console.error('[fetchProductById] Unexpected error:', err)
    throw err
  }
}

// ✅ STORE-AWARE: Add function to fetch product with related batches for specific store
export async function fetchProductWithBatches(
  productId: string,
  serverClient?: ServerClient,
): Promise<Product & { batches: Batch[] }> {
  const supabase = serverClient || createClient()

  try {
    console.log('[fetchProductWithBatches] Fetching product with batches:', { productId })

    const { data, error } = await supabase
      .schema('inventory')
      .from('products')
      .select(
        `
        *,
        batches (
          batch_id,
          batch_number,
          supplier,
          manufacture_date,
          expiry_date,
          current_quantity,
          available_quantity,
          cost_price,
          selling_price,
          status,
          location_code,
          store_id
        )
      `,
      )
      .eq('product_id', productId)
      .single()

    if (error) {
      console.error('[fetchProductWithBatches] Supabase error:', error)

      if (error.code === 'PGRST116') {
        throw new Error(`Product with ID "${productId}" not found`)
      }

      throw new Error(`Failed to fetch product with batches: ${error.message}`)
    }

    console.log('[fetchProductWithBatches] Success:', {
      productId,
      storeId: data.store_id,
      batchCount: data.batches?.length || 0,
    })

    return data as Product & { batches: Batch[] }
  } catch (err) {
    console.error('[fetchProductWithBatches] Unexpected error:', err)
    throw err
  }
}
