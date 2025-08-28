// lib/queries/products.ts

import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

// Type for the server client (it's a Promise!)
type ServerClient = Awaited<ReturnType<typeof createServerClient>>

// Type for a product row from global products table
type BaseProduct = Database['inventory']['Tables']['products']['Row']

// Type for store-specific product data from junction table
export type StoreProduct = {
  store_id: string
  product_id: string
  cost_price: number
  selling_price: number
  is_active: boolean
  store_sku?: string
  supplier_code?: string
}

// Type for the joined query result with categories
type StoreProductWithProduct = {
  store_id: string
  product_id: string
  cost_price: number | null
  selling_price: number | null
  is_active: boolean
  store_sku: string | null
  supplier_code: string | null
  created_at: string
  updated_at: string
  products: BaseProduct & {
    categories?: {
      category_id: string
      category_code: string
      display_name_en: string
      display_name_fr: string
      typical_shelf_life_days?: number | null
    } | null
  } | null
}

// Combined type that includes both global product data and store-specific data
// NOTE: When returned by our query functions, total_stock and active_batches_count 
// are STORE-SPECIFIC calculations from inventory.batches, not global aggregates
// - total_stock: sum of current_quantity for ALL batches with quantity > 0 (includes expired)
// - active_batches_count: count of batches with status = 'active' only
export type Product = BaseProduct & {
  // Store-specific pricing and settings (from store_products junction table)
  store_cost_price?: number | null
  store_selling_price?: number | null
  store_is_active?: boolean
  store_sku?: string | null
  supplier_code?: string | null
  // Category information from standardized categories table
  category_display_name?: string
  category_display_name_fr?: string
}

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
  category?: Database['inventory']['Tables']['products']['Row']['category_id']
  brand?: string
  expiringOnly?: boolean
  sort?: ProductSort
  // Add more as needed
}

export type ProductsPageParam = {
  page: number
  pageSize: number
}

// Helper function to build single Supabase order clause (currently unused)
// function buildOrderClause(sort?: ProductSort): { column: string; ascending: boolean } {
//   if (!sort) {
//     return { column: 'created_at', ascending: false } // Default: newest first
//   }

//   // For joined table queries, we need to be careful about column references
//   // PostgREST doesn't handle multiple order clauses well across joined tables
//   const columnMap: Record<SortField, string> = {
//     name: 'products(name)',
//     category: 'products(category)',
//     brand: 'products(brand)',
//     total_stock: 'products(total_stock)',
//     base_selling_price: 'products(base_selling_price)',
//     active_batches_count: 'products(active_batches_count)',
//     created_at: 'products(created_at)',
//   }

//   return {
//     column: columnMap[sort.field],
//     ascending: sort.direction === 'asc',
//   }
// }

export async function fetchProducts(
  storeId: string,
  serverClient?: ServerClient,
): Promise<Product[]> {
  const supabase = serverClient || createClient()
  console.log('[fetchProducts] Querying store_products with store-specific stock calculations:', { storeId })

  try {
    // First get store products with their base product info
    const { data: storeProductsData, error: storeError } = await supabase
      .schema('inventory')
      .from('store_products')
      .select(
        `
        *,
        products:product_id (
          product_id,
          name,
          brand,
          category,
          barcode,
          typical_shelf_life_days,
          base_cost_price,
          base_selling_price,
          description,
          image_url,
          sku,
          unit_type,
          created_at,
          updated_at,
          created_by,
          last_verified,
          open_food_facts_data
        )
      `,
      )
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (storeError) {
      console.error('[fetchProducts] Error fetching store products:', storeError)
      throw new Error(`Failed to fetch store products: ${storeError.message}`)
    }

    if (!storeProductsData || storeProductsData.length === 0) {
      return []
    }

    // Extract product IDs for batch aggregation
    const productIds = storeProductsData.map(sp => sp.product_id)

    // Get store-specific batch aggregations
    const { data: batchAggregations, error: batchError } = await supabase
      .schema('inventory')
      .from('batches')
      .select(`
        product_id,
        current_quantity,
        status
      `)
      .eq('store_id', storeId)
      .in('product_id', productIds)

    if (batchError) {
      console.warn('[fetchProducts] Error fetching batch data:', batchError)
      // Continue without batch data rather than failing
    }

    // Calculate store-specific aggregations for each product
    const productAggregations = new Map<string, {
      total_stock: number;
      active_batches_count: number;
    }>()

    if (batchAggregations) {
      batchAggregations.forEach(batch => {
        const current = productAggregations.get(batch.product_id) || {
          total_stock: 0,
          active_batches_count: 0
        }
        
        // Count all batches with quantity > 0 for total physical inventory
        if (Number(batch.current_quantity) > 0) {
          current.total_stock += Number(batch.current_quantity) || 0
        }
        
        // Only count active batches for active_batches_count
        if (batch.status === 'active') {
          current.active_batches_count += 1
        }
        
        productAggregations.set(batch.product_id, current)
      })
    }

    // Transform the data with store-specific stock calculations
    const transformedData = storeProductsData.map((storeProduct: StoreProductWithProduct) => {
      const aggregation = productAggregations.get(storeProduct.product_id) || {
        total_stock: 0,
        active_batches_count: 0
      }

      return {
        ...storeProduct.products, // Global product data
        store_cost_price: storeProduct.cost_price, // Store-specific pricing
        store_selling_price: storeProduct.selling_price,
        store_is_active: storeProduct.is_active,
        store_sku: storeProduct.store_sku,
        supplier_code: storeProduct.supplier_code,
        // Override with store-specific calculations
        total_stock: aggregation.total_stock,
        active_batches_count: aggregation.active_batches_count,
        avg_days_to_expiry: null // TODO: Could calculate this if needed
      }
    })

    console.log('[fetchProducts] Success with store-specific stock:', { 
      storeId, 
      count: transformedData.length,
      totalStock: transformedData.reduce((sum, p) => sum + (p.total_stock || 0), 0)
    })
    return transformedData as Product[]
  } catch (err) {
    console.error('[fetchProducts] Unexpected error:', err)
    throw err
  }
}

// ✅ FIXED: Store-specific stock calculations with pagination
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
    // ✅ MANDATORY STORE FILTER
    if (!filters.storeId) {
      throw new Error('Store ID is required for fetching products')
    }

    console.log('[fetchProductsPage] Fetching with store-specific stock calculations:', filters.storeId)

    // Build the select query with categories join
    let query = supabase
      .schema('inventory')
      .from('store_products')
      .select(
        `
        *,
        products:product_id (
          product_id,
          name,
          brand,
          category,
          category_id,
          barcode,
          typical_shelf_life_days,
          base_cost_price,
          base_selling_price,
          description,
          image_url,
          sku,
          unit_type,
          created_at,
          updated_at,
          created_by,
          last_verified,
          open_food_facts_data,
          categories:category_id (
            category_id,
            category_code,
            display_name_en,
            display_name_fr,
            typical_shelf_life_days
          )
        )
      `,
        { count: 'exact' },
      )
      .eq('store_id', filters.storeId)
      .eq('is_active', true) // Only fetch active store products

    // Apply filters using category_code if provided
    if (filters.category) {
      console.log('[fetchProductsPage] Applying category filter:', filters.category)
      // Filter will be applied post-query to avoid join issues
    }

    if (filters.brand) {
      console.log('[fetchProductsPage] Applying brand filter:', filters.brand)
      query = query.eq('products.brand', filters.brand)
    }

    if (filters.expiringOnly) {
      // For expiring products, we need to join with batches
      // For now, we'll skip this complex filter in the main query
      console.log('[fetchProductsPage] Expiring filter skipped in SQL, will filter in memory')
    }

    // ✅ FIXED: Single order clause approach
    console.log('[fetchProductsPage] Applying sort:', {
      field: filters.sort?.field,
      direction: filters.sort?.direction,
    })

    // Handle sorting - special case for total_stock since it requires aggregation across all products
    const isStockBasedSort = filters.sort?.field === 'total_stock' || filters.sort?.field === 'active_batches_count'
    
    if (isStockBasedSort) {
      // For stock-based sorting, we need to fetch all products, calculate stock, sort, then paginate
      console.log('[fetchProductsPage] Stock-based sorting - fetching all products for proper sorting')
      query = query.order('created_at', { ascending: false }) // Fallback sort for fetching all
      // We'll override pagination below for this case
    } else if (filters.sort?.field === 'created_at') {
      // Sort by store_products created_at (when product was added to store)
      query = query.order('created_at', { ascending: filters.sort.direction === 'asc' })
    } else if (filters.sort?.field === 'name') {
      // For product name, we need to use embedded ordering
      query = query.order('products(name)', { ascending: filters.sort.direction === 'asc' })
    } else if (filters.sort?.field === 'category') {
      query = query.order('products(category)', { ascending: filters.sort.direction === 'asc' })
    } else if (filters.sort?.field === 'brand') {
      query = query.order('products(brand)', { ascending: filters.sort.direction === 'asc' })
    } else if (filters.sort?.field === 'base_selling_price') {
      query = query.order('products(base_selling_price)', {
        ascending: filters.sort.direction === 'asc',
      })
    } else {
      // Default sort by store_products created_at
      query = query.order('created_at', { ascending: false })
    }

    let storeProductsData: StoreProductWithProduct[]
    let totalCount: number
    let error: any

    if (isStockBasedSort) {
      // For stock-based sorting, fetch ALL products first
      console.log('[fetchProductsPage] Fetching all products for stock-based sorting')
      const response = await query
      error = response.error
      storeProductsData = (response.data as unknown as StoreProductWithProduct[]) || []
      totalCount = response.count || 0
    } else {
      // Normal pagination
      const rangeFrom = page * pageSize
      const rangeTo = (page + 1) * pageSize - 1
      console.log('[fetchProductsPage] Pagination:', { page, pageSize, rangeFrom, rangeTo })
      const response = await query.range(rangeFrom, rangeTo)
      error = response.error
      storeProductsData = (response.data as unknown as StoreProductWithProduct[]) || []
      totalCount = response.count || 0
    }

    if (error) {
      console.error('[fetchProductsPage] Supabase error:', error)
      throw new Error(`Failed to fetch products page: ${error.message}`)
    }

    console.log('[fetchProductsPage] Raw response sample:', {
      count: totalCount,
      sampleData: storeProductsData?.slice(0, 2)
    })

    if (!storeProductsData || storeProductsData.length === 0) {
      return {
        data: [],
        count: totalCount,
        nextPage: undefined,
      }
    }

    // Check if products join is working
    const productsWithNullJoin = storeProductsData.filter(sp => !sp.products)
    if (productsWithNullJoin.length > 0) {
      console.warn('[fetchProductsPage] Products with null join detected:', {
        count: productsWithNullJoin.length,
        total: storeProductsData.length,
        sampleIds: productsWithNullJoin.slice(0, 3).map(sp => sp.product_id)
      })
    }

    // Apply post-query filtering for category using category_code
    let filteredStoreProductsData = storeProductsData
    
    if (filters.category) {
      console.log('[fetchProductsPage] Applying category filter post-query:', filters.category)
      
      // Debug: Check what categories we actually have
      if (storeProductsData.length > 0) {
        const categoriesFound = storeProductsData.map(sp => ({
          product_id: sp.product_id,
          category_code: sp.products?.categories?.category_code,
          display_name: sp.products?.categories?.display_name_en,
          name: sp.products?.name
        })).slice(0, 3)
        console.log('[fetchProductsPage] Sample categories in data:', categoriesFound)
      }
      
      filteredStoreProductsData = filteredStoreProductsData.filter(sp => 
        sp.products?.categories?.category_code === filters.category
      )
      console.log('[fetchProductsPage] After category filter:', {
        before: storeProductsData.length,
        after: filteredStoreProductsData.length,
        requestedCategory: filters.category
      })
    }

    // Extract product IDs for batch aggregation (from filtered data)
    const productIds = filteredStoreProductsData.map(sp => sp.product_id)

    // Get store-specific batch aggregations for this page's products
    const { data: batchAggregations, error: batchError } = await supabase
      .schema('inventory')
      .from('batches')
      .select(`
        product_id,
        current_quantity,
        status
      `)
      .eq('store_id', filters.storeId)
      .in('product_id', productIds)

    if (batchError) {
      console.warn('[fetchProductsPage] Error fetching batch data:', batchError)
      // Continue without batch data rather than failing
    }

    // Calculate store-specific aggregations for each product
    const productAggregations = new Map<string, {
      total_stock: number;
      active_batches_count: number;
    }>()

    if (batchAggregations) {
      batchAggregations.forEach(batch => {
        const current = productAggregations.get(batch.product_id) || {
          total_stock: 0,
          active_batches_count: 0
        }
        
        // Count all batches with quantity > 0 for total physical inventory
        if (Number(batch.current_quantity) > 0) {
          current.total_stock += Number(batch.current_quantity) || 0
        }
        
        // Only count active batches for active_batches_count
        if (batch.status === 'active') {
          current.active_batches_count += 1
        }
        
        productAggregations.set(batch.product_id, current)
      })
    }

    // Transform the data with store-specific stock calculations
    let transformedData = filteredStoreProductsData.map((storeProduct: StoreProductWithProduct) => {
      const aggregation = productAggregations.get(storeProduct.product_id) || {
        total_stock: 0,
        active_batches_count: 0
      }

      // Handle case where products join fails (null products field)
      const productData = storeProduct.products || {}
      
      // Extract category information from the nested categories table
      const categoryData = storeProduct.products?.categories || null
      
      return {
        ...productData, // Global product data (may be empty object)
        product_id: storeProduct.product_id, // Ensure product_id is always present
        // Add category information from the standardized categories table
        category_display_name: categoryData?.display_name_en,
        category_display_name_fr: categoryData?.display_name_fr,
        category_id: categoryData?.category_id || (productData as any)?.category_id,
        // Store-specific data
        store_cost_price: storeProduct.cost_price, // Store-specific pricing
        store_selling_price: storeProduct.selling_price,
        store_is_active: storeProduct.is_active,
        store_sku: storeProduct.store_sku,
        supplier_code: storeProduct.supplier_code,
        // Override with store-specific calculations
        total_stock: aggregation.total_stock,
        active_batches_count: aggregation.active_batches_count,
        avg_days_to_expiry: null // TODO: Could calculate this if needed
      }
    })

    // Apply in-memory sorting for stock-based fields after aggregation
    if (filters.sort?.field === 'total_stock') {
      transformedData.sort((a, b) => {
        const aStock = a.total_stock || 0
        const bStock = b.total_stock || 0
        return filters.sort!.direction === 'asc' ? aStock - bStock : bStock - aStock
      })
      console.log('[fetchProductsPage] Applied in-memory total_stock sorting:', {
        direction: filters.sort.direction,
        firstItemStock: transformedData[0]?.total_stock,
        lastItemStock: transformedData[transformedData.length - 1]?.total_stock
      })
    } else if (filters.sort?.field === 'active_batches_count') {
      transformedData.sort((a, b) => {
        const aBatches = a.active_batches_count || 0
        const bBatches = b.active_batches_count || 0
        return filters.sort!.direction === 'asc' ? aBatches - bBatches : bBatches - aBatches
      })
      console.log('[fetchProductsPage] Applied in-memory active_batches_count sorting:', {
        direction: filters.sort.direction,
        firstItemBatches: transformedData[0]?.active_batches_count,
        lastItemBatches: transformedData[transformedData.length - 1]?.active_batches_count
      })
    }

    // Apply pagination after sorting for stock-based sorts
    let finalData = transformedData
    let finalCount = transformedData.length // Use actual filtered/transformed count

    if (isStockBasedSort) {
      // For stock-based sorting, we fetched all products and sorted them
      // Now apply pagination manually
      const rangeFrom = page * pageSize
      const rangeTo = (page + 1) * pageSize
      finalData = transformedData.slice(rangeFrom, rangeTo)
      finalCount = transformedData.length // Total after transformation
      
      console.log('[fetchProductsPage] Applied post-sort pagination:', {
        totalProducts: transformedData.length,
        pageStart: rangeFrom,
        pageEnd: rangeTo,
        returnedProducts: finalData.length
      })
    }

    console.log('[fetchProductsPage] Success with store-specific stock:', {
      storeId: filters.storeId,
      dataCount: finalData.length,
      totalCount: finalCount,
      totalStockAcrossProducts: finalData.reduce((sum, p) => sum + (p.total_stock || 0), 0),
      hasNextPage: finalCount > (page + 1) * pageSize,
      appliedFilters: { category: filters.category, brand: filters.brand }
    })

    return {
      data: finalData as Product[],
      count: finalCount,
      nextPage: finalCount > (page + 1) * pageSize ? page + 1 : undefined,
    }
  } catch (err) {
    console.error('[fetchProductsPage] Unexpected error:', err)
    throw err
  }
}

// New interface for creating products with store association
export interface CreateProductData {
  // Global product data
  name: string
  brand?: string
  category: string
  barcode?: string
  typical_shelf_life_days: number
  base_cost_price: number
  base_selling_price: number
  description?: string
  image_url?: string
  sku: string
  unit_type: string
  open_food_facts_data?: unknown
  // Store-specific data
  storeId: string
  cost_price?: number
  selling_price?: number
  store_sku?: string
  supplier_code?: string
}

export async function createProduct(productData: CreateProductData): Promise<Product> {
  const supabase = createClient()

  try {
    console.log('[createProduct] Creating product:', {
      storeId: productData.storeId,
      sku: productData.sku,
      name: productData.name,
    })

    // Step 1: Create the global product record
    const globalProductData = {
      name: productData.name,
      brand: productData.brand,
      category: productData.category,
      barcode: productData.barcode,
      typical_shelf_life_days: productData.typical_shelf_life_days,
      base_cost_price: productData.base_cost_price,
      base_selling_price: productData.base_selling_price,
      description: productData.description,
      image_url: productData.image_url,
      sku: productData.sku,
      unit_type: productData.unit_type,
      open_food_facts_data: productData.open_food_facts_data,
    }

    const { data: globalProduct, error: globalError } = await supabase
      .schema('inventory')
      .from('products')
      .insert(globalProductData)
      .select()
      .single()

    if (globalError) {
      console.error('[createProduct] Error creating global product:', globalError)
      if (globalError.code === '23505') {
        throw new Error(`Product with SKU "${productData.sku}" already exists`)
      }
      throw new Error(`Failed to create product: ${globalError.message}`)
    }

    // Step 2: Create the store-product association
    const storeProductData = {
      store_id: productData.storeId,
      product_id: globalProduct.product_id,
      cost_price: productData.cost_price || productData.base_cost_price,
      selling_price: productData.selling_price || productData.base_selling_price,
      store_sku: productData.store_sku,
      supplier_code: productData.supplier_code,
      is_active: true,
    }

    const { data: storeProduct, error: storeError } = await supabase
      .schema('inventory')
      .from('store_products')
      .insert(storeProductData)
      .select()
      .single()

    if (storeError) {
      console.error('[createProduct] Error creating store-product association:', storeError)
      // Clean up the global product if store association fails
      await supabase
        .schema('inventory')
        .from('products')
        .delete()
        .eq('product_id', globalProduct.product_id)
      throw new Error(`Failed to create store-product association: ${storeError.message}`)
    }

    // Return the combined data
    const combinedProduct = {
      ...globalProduct,
      store_cost_price: storeProduct.cost_price,
      store_selling_price: storeProduct.selling_price,
      store_is_active: storeProduct.is_active,
      store_sku: storeProduct.store_sku,
      supplier_code: storeProduct.supplier_code,
    }

    console.log('[createProduct] Success:', {
      productId: globalProduct.product_id,
      storeId: productData.storeId,
    })
    return combinedProduct as Product
  } catch (err) {
    console.error('[createProduct] Unexpected error:', err)
    throw err
  }
}

// Update interface that handles both global and store-specific updates
export interface UpdateProductData {
  // Global product updates
  name?: string
  brand?: string
  category?: string
  description?: string
  image_url?: string
  typical_shelf_life_days?: number
  base_cost_price?: number
  base_selling_price?: number
  // Store-specific updates
  cost_price?: number
  selling_price?: number
  is_active?: boolean
  store_sku?: string
  supplier_code?: string
}

export async function updateProduct(
  productId: string,
  updates: UpdateProductData,
  storeId: string,
): Promise<Product> {
  const supabase = createClient()

  try {
    console.log('[updateProduct] Updating product:', { productId, updates, storeId })

    // Split updates into global and store-specific
    const globalUpdates: Record<string, unknown> = {}
    const storeUpdates: Record<string, unknown> = {}

    // Global product updates
    if (updates.name !== undefined) globalUpdates.name = updates.name
    if (updates.brand !== undefined) globalUpdates.brand = updates.brand
    if (updates.category !== undefined) globalUpdates.category = updates.category
    if (updates.description !== undefined) globalUpdates.description = updates.description
    if (updates.image_url !== undefined) globalUpdates.image_url = updates.image_url
    if (updates.typical_shelf_life_days !== undefined)
      globalUpdates.typical_shelf_life_days = updates.typical_shelf_life_days
    if (updates.base_cost_price !== undefined)
      globalUpdates.base_cost_price = updates.base_cost_price
    if (updates.base_selling_price !== undefined)
      globalUpdates.base_selling_price = updates.base_selling_price

    // Store-specific updates
    if (updates.cost_price !== undefined) storeUpdates.cost_price = updates.cost_price
    if (updates.selling_price !== undefined) storeUpdates.selling_price = updates.selling_price
    if (updates.is_active !== undefined) storeUpdates.is_active = updates.is_active
    if (updates.store_sku !== undefined) storeUpdates.store_sku = updates.store_sku
    if (updates.supplier_code !== undefined) storeUpdates.supplier_code = updates.supplier_code

    // Update global product if there are global changes
    if (Object.keys(globalUpdates).length > 0) {
      globalUpdates.updated_at = new Date().toISOString()

      const { error } = await supabase
        .schema('inventory')
        .from('products')
        .update(globalUpdates)
        .eq('product_id', productId)

      if (error) {
        console.error('[updateProduct] Error updating global product:', error)
        if (error.code === 'PGRST116') {
          throw new Error(`Product with ID "${productId}" not found`)
        }
        if (error.code === '23505') {
          throw new Error(`Another product already uses this SKU`)
        }
        throw new Error(`Failed to update product: ${error.message}`)
      }
    }

    // Update store-specific data if there are store changes
    if (Object.keys(storeUpdates).length > 0) {
      storeUpdates.updated_at = new Date().toISOString()

      const { error } = await supabase
        .schema('inventory')
        .from('store_products')
        .update(storeUpdates)
        .eq('product_id', productId)
        .eq('store_id', storeId)

      if (error) {
        console.error('[updateProduct] Error updating store product:', error)
        if (error.code === 'PGRST116') {
          throw new Error(`Product association for store "${storeId}" not found`)
        }
        throw new Error(`Failed to update store product data: ${error.message}`)
      }
    }

    // Fetch the complete updated product data
    const updatedProduct = await fetchProductById(productId, storeId)

    console.log('[updateProduct] Success:', { productId, storeId })
    return updatedProduct
  } catch (err) {
    console.error('[updateProduct] Unexpected error:', err)
    throw err
  }
}

export async function deleteProduct(productId: string, storeId: string): Promise<void> {
  const supabase = createClient()

  try {
    console.log('[deleteProduct] Deleting product from store:', { productId, storeId })

    // Check for related batches first
    const { data: relatedBatches, error: batchError } = await supabase
      .schema('inventory')
      .from('batches')
      .select('batch_id')
      .eq('product_id', productId)
      .eq('store_id', storeId)
      .limit(1)

    if (batchError) {
      console.error('[deleteProduct] Error checking batches:', batchError)
      throw new Error(`Failed to check related batches: ${batchError.message}`)
    }

    if (relatedBatches && relatedBatches.length > 0) {
      throw new Error('Cannot delete product that has associated batches. Delete batches first.')
    }

    // Delete the store-product association (this removes the product from this store)
    const { error: storeProductError } = await supabase
      .schema('inventory')
      .from('store_products')
      .delete()
      .eq('product_id', productId)
      .eq('store_id', storeId)

    if (storeProductError) {
      console.error('[deleteProduct] Error deleting store-product association:', storeProductError)
      throw new Error(`Failed to remove product from store: ${storeProductError.message}`)
    }

    console.log('[deleteProduct] Success:', { productId, storeId, globalProductKept: true })
  } catch (err) {
    console.error('[deleteProduct] Unexpected error:', err)
    throw err
  }
}

// Fetch available categories for filter dropdown
export async function fetchCategories(serverClient?: ServerClient): Promise<{
  category_id: string
  category_code: string
  display_name_en: string
  display_name_fr: string
}[]> {
  const supabase = serverClient || createClient()
  
  try {
    console.log('[fetchCategories] Fetching standardized categories')
    
    const { data: categories, error } = await supabase
      .schema('inventory')
      .from('categories')
      .select(`
        category_id,
        category_code,
        display_name_en,
        display_name_fr
      `)
      .order('display_name_en', { ascending: true })
    
    if (error) {
      console.error('[fetchCategories] Error fetching categories:', error)
      throw new Error(`Failed to fetch categories: ${error.message}`)
    }
    
    console.log('[fetchCategories] Success:', { count: categories?.length || 0 })
    return categories || []
  } catch (err) {
    console.error('[fetchCategories] Unexpected error:', err)
    throw err
  }
}

export async function fetchProductById(
  productId: string,
  storeId: string,
  serverClient?: ServerClient,
): Promise<Product> {
  const supabase = serverClient || createClient()

  try {
    console.log('[fetchProductById] Fetching product with store-specific stock:', { productId, storeId })

    // Get the product through the store_products junction table
    const { data, error } = await supabase
      .schema('inventory')
      .from('store_products')
      .select(
        `
        *,
        products:product_id (
          product_id,
          name,
          brand,
          category,
          barcode,
          typical_shelf_life_days,
          base_cost_price,
          base_selling_price,
          description,
          image_url,
          sku,
          unit_type,
          created_at,
          updated_at,
          created_by,
          last_verified,
          open_food_facts_data
        )
      `,
      )
      .eq('product_id', productId)
      .eq('store_id', storeId)
      .single()

    if (error) {
      console.error('[fetchProductById] Supabase error:', error)

      if (error.code === 'PGRST116') {
        throw new Error(`Product with ID "${productId}" not found in store "${storeId}"`)
      }

      throw new Error(`Failed to fetch product: ${error.message}`)
    }

    // Get store-specific batch aggregations for this product
    const { data: batchAggregations, error: batchError } = await supabase
      .schema('inventory')
      .from('batches')
      .select(`
        current_quantity,
        status
      `)
      .eq('store_id', storeId)
      .eq('product_id', productId)

    if (batchError) {
      console.warn('[fetchProductById] Error fetching batch data:', batchError)
      // Continue without batch data rather than failing
    }

    // Calculate store-specific aggregations
    let total_stock = 0
    let active_batches_count = 0

    if (batchAggregations) {
      batchAggregations.forEach(batch => {
        // Count all batches with quantity > 0 for total physical inventory
        if (Number(batch.current_quantity) > 0) {
          total_stock += Number(batch.current_quantity) || 0
        }
        
        // Only count active batches for active_batches_count
        if (batch.status === 'active') {
          active_batches_count += 1
        }
      })
    }

    // Transform the data with store-specific stock calculations
    const combinedProduct = {
      ...data.products,
      store_cost_price: data.cost_price,
      store_selling_price: data.selling_price,
      store_is_active: data.is_active,
      store_sku: data.store_sku,
      supplier_code: data.supplier_code,
      // Override with store-specific calculations
      total_stock,
      active_batches_count,
      avg_days_to_expiry: null // TODO: Could calculate this if needed
    }

    console.log('[fetchProductById] Success with store-specific stock:', { 
      productId, 
      storeId, 
      total_stock, 
      active_batches_count 
    })
    return combinedProduct as Product
  } catch (err) {
    console.error('[fetchProductById] Unexpected error:', err)
    throw err
  }
}
