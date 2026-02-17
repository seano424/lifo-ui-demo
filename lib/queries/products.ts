import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'
import type { Database } from '@/types/supabase-extended'
import type { BatchWithProduct } from '@/lib/queries/batches'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

type BaseProduct = Database['inventory']['Tables']['products']['Row']

export interface Category {
  category_id: string
  category_code: string
  display_name_en: string
  display_name_fr: string | null
  display_name_nl?: string | null
  product_count?: number
}

export type StoreProduct = {
  store_id: string
  product_id: string
  cost_price: number
  selling_price: number
  is_active: boolean
  store_sku?: string
  supplier_code?: string
}

type StoreProductWithProduct = {
  store_id: string
  product_id: string
  cost_price: number | null
  selling_price: number | null
  is_active: boolean
  store_sku: string | null
  supplier_code: string | null
  quantity: number | null
  quantity_updated_at: string | null
  created_at: string
  updated_at: string
  products:
    | (BaseProduct & {
        categories?: {
          category_id: string
          category_code: string
          display_name_en: string
          display_name_fr: string
          display_name_nl?: string | null
          typical_shelf_life_days?: number | null
        } | null
      })
    | null
}

export type Product = BaseProduct & {
  store_cost_price?: number | null
  store_selling_price?: number | null
  store_is_active?: boolean
  store_sku?: string | null
  supplier_code?: string | null
  category_code?: string
  category_display_name?: string
  category_display_name_fr?: string
  category_display_name_nl?: string
  // Shelf life overrides and calculated values
  shelf_life_override_days?: number | null
  category_default_shelf_life_days?: number | null
  category_typical_shelf_life_days?: number | null
  effective_shelf_life?: number
  shelf_life_source?:
    | 'product_override'
    | 'store_category_override'
    | 'product_base'
    | 'category_base'
    | 'default'
  // Tracking mode (inferred from shelf life configuration)
  tracking_mode?: 'auto' | 'manual'
  // Aggregated batch data (from RPC or client-side calculation)
  batch_quantity?: number
  active_batches_count?: number
  avg_days_to_expiry?: number | null
  // Store synced quantity (from store_products.quantity — integration-agnostic)
  store_quantity?: number | null
  store_quantity_updated_at?: string | null
}

export type SortField =
  | 'name'
  | 'category'
  | 'brand'
  | 'batch_quantity'
  | 'active_batches_count'
  | 'created_at'
  | 'store_quantity'
  | 'needs_expiry'

export type SortDirection = 'asc' | 'desc'

export type ProductSort = {
  field: SortField
  direction: SortDirection
}

export type ProductFilters = {
  storeId?: string
  category?: string
  brand?: string
  search?: string
  expiringOnly?: boolean
  sort?: ProductSort
}

export type ProductsPageParam = {
  page: number
  pageSize: number
}

export async function fetchProducts(
  storeId: string,
  serverClient?: ServerClient,
): Promise<Product[]> {
  const supabase = serverClient || createClient()

  try {
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
      )
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (storeError) {
      logger.queryWarn('fetchProducts', 'Error fetching store products', {
        error: storeError.message,
        code: storeError.code,
      })
      throw new Error(`Failed to fetch store products: ${storeError.message}`)
    }

    if (!storeProductsData || storeProductsData.length === 0) {
      return []
    }

    const productIds = storeProductsData.map(sp => sp.product_id)

    const { data: batchAggregations, error: batchError } = await supabase
      .schema('inventory')
      .from('batches')
      .select(
        `
        product_id,
        current_quantity,
        status
      `,
      )
      .eq('store_id', storeId)
      .in('product_id', productIds)

    if (batchError) {
      logger.queryWarn('fetchProducts', 'Error fetching batch data', { error: batchError.message })
    }

    const productAggregations = new Map<
      string,
      {
        batch_quantity: number
        active_batches_count: number
      }
    >()

    if (batchAggregations) {
      batchAggregations.forEach(batch => {
        const current = productAggregations.get(batch.product_id) || {
          batch_quantity: 0,
          active_batches_count: 0,
        }

        if (Number(batch.current_quantity) > 0) {
          current.batch_quantity += Number(batch.current_quantity) || 0
        }

        if (batch.status === 'active') {
          current.active_batches_count += 1
        }

        productAggregations.set(batch.product_id, current)
      })
    }

    const transformedData = (storeProductsData as unknown as StoreProductWithProduct[]).map(
      (storeProduct: StoreProductWithProduct) => {
        const aggregation = productAggregations.get(storeProduct.product_id) || {
          batch_quantity: 0,
          active_batches_count: 0,
        }

        const categoryData = storeProduct.products?.categories || null

        return {
          ...storeProduct.products,
          category_code: categoryData?.category_code,
          category_display_name: categoryData?.display_name_en,
          category_display_name_fr: categoryData?.display_name_fr,
          category_display_name_nl: categoryData?.display_name_nl,
          store_cost_price: storeProduct.cost_price,
          store_selling_price: storeProduct.selling_price,
          store_is_active: storeProduct.is_active,
          store_sku: storeProduct.store_sku,
          supplier_code: storeProduct.supplier_code,
          store_quantity: storeProduct.quantity,
          store_quantity_updated_at: storeProduct.quantity_updated_at,
          batch_quantity: aggregation.batch_quantity,
          active_batches_count: aggregation.active_batches_count,
          avg_days_to_expiry: null,
        }
      },
    )

    return transformedData as Product[]
  } catch (err) {
    logger.queryWarn('fetchProducts', 'Unexpected error', {
      error: err instanceof Error ? err.message : String(err),
    })
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
  const context = 'fetchProductsPage'

  return withPerformanceTracking(
    context,
    'Fetch products page',
    { page, pageSize, storeId: filters.storeId, filterCount: Object.keys(filters).length },
    async () => {
      try {
        if (!filters.storeId) {
          throw new Error('Store ID is required for fetching products')
        }

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
          .eq('is_active', true)

        // Apply filters using category_code if provided
        if (filters.category) {
        }

        if (filters.brand) {
          query = query.eq('products.brand', filters.brand)
        }

        if (filters.expiringOnly) {
        }

        const isInMemorySort =
          filters.sort?.field === 'batch_quantity' ||
          filters.sort?.field === 'active_batches_count' ||
          filters.sort?.field === 'category'
        const isStockBasedSort =
          filters.sort?.field === 'batch_quantity' || filters.sort?.field === 'active_batches_count'

        if (isInMemorySort) {
          if (isStockBasedSort) {
          } else {
          }
          query = query.order('created_at', { ascending: false })
        } else if (filters.sort?.field === 'created_at') {
          query = query.order('created_at', {
            ascending: filters.sort.direction === 'asc',
          })
        } else if (filters.sort?.field === 'name') {
          query = query.order('products(name)', {
            ascending: filters.sort.direction === 'asc',
          })
        } else if (filters.sort?.field === 'category') {
          query = query.order('created_at', { ascending: false })
        } else if (filters.sort?.field === 'brand') {
          query = query.order('products(brand)', {
            ascending: filters.sort.direction === 'asc',
          })
        } else {
          query = query.order('created_at', { ascending: false })
        }

        let storeProductsData: StoreProductWithProduct[]
        let totalCount: number
        let error: unknown

        if (isInMemorySort) {
          const response = await query
          error = response.error
          storeProductsData = (response.data as unknown as StoreProductWithProduct[]) || []
          totalCount = response.count || 0
        } else {
          const rangeFrom = page * pageSize
          const rangeTo = (page + 1) * pageSize - 1
          const response = await query.range(rangeFrom, rangeTo)
          error = response.error
          storeProductsData = (response.data as unknown as StoreProductWithProduct[]) || []
          totalCount = response.count || 0
        }

        if (error) {
          const errorCode =
            error instanceof Error && 'code' in error
              ? (error as Error & { code?: string }).code
              : undefined
          logger.queryWarn(context, 'Query failed', {
            error: error instanceof Error ? error.message : String(error),
            code: errorCode,
            storeId: filters.storeId,
            page,
            pageSize,
          })
          const errorMessage = error instanceof Error ? error.message : String(error)
          throw new Error(`Failed to fetch products page: ${errorMessage}`)
        }

        if (!storeProductsData || storeProductsData.length === 0) {
          return {
            data: [],
            count: totalCount,
            nextPage: undefined,
          }
        }

        const productsWithNullJoin = storeProductsData.filter(sp => !sp.products)
        if (productsWithNullJoin.length > 0) {
          logger.queryWarn(context, 'Products with null join detected', {
            count: productsWithNullJoin.length,
            total: storeProductsData.length,
            sampleIds: productsWithNullJoin.slice(0, 3).map(sp => sp.product_id),
          })
        }

        let filteredStoreProductsData = storeProductsData

        if (filters.category) {
          if (process.env.NODE_ENV === 'development' && storeProductsData.length > 0) {
            logger.log(context, 'Category filtering debug', {
              categories: storeProductsData.slice(0, 3).map(sp => ({
                category_code: sp.products?.categories?.category_code,
                name: sp.products?.name,
              })),
            })
          }

          filteredStoreProductsData = filteredStoreProductsData.filter(
            sp => sp.products?.categories?.category_code === filters.category,
          )
        }

        const productIds = filteredStoreProductsData.map(sp => sp.product_id)

        const { data: batchAggregations, error: batchError } = await supabase
          .schema('inventory')
          .from('batches')
          .select(
            `
        product_id,
        current_quantity,
        status
      `,
          )
          .eq('store_id', filters.storeId)
          .in('product_id', productIds)

        if (batchError) {
          logger.queryWarn(context, 'Error fetching batch data', {
            error: batchError.message,
            code: batchError.code,
          })
        }

        const productAggregations = new Map<
          string,
          {
            batch_quantity: number
            active_batches_count: number
          }
        >()

        if (batchAggregations) {
          batchAggregations.forEach(batch => {
            const current = productAggregations.get(batch.product_id) || {
              batch_quantity: 0,
              active_batches_count: 0,
            }

            if (Number(batch.current_quantity) > 0) {
              current.batch_quantity += Number(batch.current_quantity) || 0
            }

            if (batch.status === 'active') {
              current.active_batches_count += 1
            }

            productAggregations.set(batch.product_id, current)
          })
        }

        const transformedData = filteredStoreProductsData.map(
          (storeProduct: StoreProductWithProduct) => {
            const aggregation = productAggregations.get(storeProduct.product_id) || {
              batch_quantity: 0,
              active_batches_count: 0,
            }

            const productData = storeProduct.products || {}

            const categoryData = storeProduct.products?.categories || null

            return {
              ...productData,
              product_id: storeProduct.product_id,
              category_code: categoryData?.category_code,
              category_display_name: categoryData?.display_name_en,
              category_display_name_fr: categoryData?.display_name_fr,
              category_display_name_nl: categoryData?.display_name_nl,
              category_id: categoryData?.category_id || (productData as BaseProduct)?.category_id,
              store_cost_price: storeProduct.cost_price, // Store-specific pricing
              store_selling_price: storeProduct.selling_price,
              store_is_active: storeProduct.is_active,
              store_sku: storeProduct.store_sku,
              supplier_code: storeProduct.supplier_code,
              store_quantity: storeProduct.quantity,
              store_quantity_updated_at: storeProduct.quantity_updated_at,
              batch_quantity: aggregation.batch_quantity,
              active_batches_count: aggregation.active_batches_count,
              avg_days_to_expiry: null,
            }
          },
        )

        if (filters.sort?.field === 'batch_quantity') {
          transformedData.sort((a, b) => {
            const aStock = a.batch_quantity || 0
            const bStock = b.batch_quantity || 0
            return filters.sort!.direction === 'asc' ? aStock - bStock : bStock - aStock
          })
        } else if (filters.sort?.field === 'active_batches_count') {
          transformedData.sort((a, b) => {
            const aBatches = a.active_batches_count || 0
            const bBatches = b.active_batches_count || 0
            return filters.sort!.direction === 'asc' ? aBatches - bBatches : bBatches - aBatches
          })
        } else if (filters.sort?.field === 'category') {
          transformedData.sort((a, b) => {
            const aCategory = a.category_display_name || a.category_code || ''
            const bCategory = b.category_display_name || b.category_code || ''
            return filters.sort!.direction === 'asc'
              ? aCategory.localeCompare(bCategory)
              : bCategory.localeCompare(aCategory)
          })
        }

        let finalData = transformedData
        let finalCount = transformedData.length

        if (isInMemorySort) {
          const rangeFrom = page * pageSize
          const rangeTo = (page + 1) * pageSize
          finalData = transformedData.slice(rangeFrom, rangeTo)
          finalCount = transformedData.length
        }

        logger.log(context, 'Products fetched successfully', {
          storeId: filters.storeId,
          page,
          productCount: finalData.length,
          totalCount: finalCount,
        })

        return {
          data: finalData as Product[],
          count: finalCount,
          nextPage: finalCount > (page + 1) * pageSize ? page + 1 : undefined,
        }
      } catch (err) {
        logger.queryWarn(context, 'Unexpected error', {
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }
    },
  )
}

export interface CreateProductData {
  name: string
  brand?: string
  category_id?: string
  barcode?: string
  typical_shelf_life_days: number
  base_cost_price: number
  base_selling_price: number
  description?: string
  image_url?: string
  sku: string
  unit_type: string
  open_food_facts_data?: unknown

  storeId: string
  cost_price?: number
  selling_price?: number
  store_sku?: string
  supplier_code?: string
}

export async function createProduct(productData: CreateProductData): Promise<Product> {
  const supabase = createClient()
  const context = 'createProduct'

  return withPerformanceTracking(
    context,
    'Create product',
    { storeId: productData.storeId, sku: productData.sku },
    async () => {
      try {
        const globalProductData = {
          name: productData.name,
          brand: productData.brand,
          category_id: productData.category_id,
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
          .insert(
            globalProductData as unknown as Database['inventory']['Tables']['products']['Insert'],
          )
          .select()
          .single()

        if (globalError) {
          logger.queryWarn(context, 'Error creating global product', {
            error: globalError.message,
            code: globalError.code,
            sku: productData.sku,
          })
          if (globalError.code === '23505') {
            throw new Error(`Product with SKU "${productData.sku}" already exists`)
          }
          throw new Error(`Failed to create product: ${globalError.message}`)
        }

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
          logger.queryWarn(context, 'Error creating store-product association', {
            error: storeError.message,
            code: storeError.code,
            productId: globalProduct.product_id,
            storeId: productData.storeId,
          })

          await supabase
            .schema('inventory')
            .from('products')
            .delete()
            .eq('product_id', globalProduct.product_id)
          throw new Error(`Failed to create store-product association: ${storeError.message}`)
        }

        const combinedProduct = {
          ...globalProduct,
          store_cost_price: storeProduct.cost_price,
          store_selling_price: storeProduct.selling_price,
          store_is_active: storeProduct.is_active,
          store_sku: storeProduct.store_sku,
          supplier_code: storeProduct.supplier_code,
        }

        logger.query(context, 'Product created successfully', {
          productId: globalProduct.product_id,
          storeId: productData.storeId,
          name: productData.name,
        })

        return combinedProduct as Product
      } catch (err) {
        logger.queryWarn(context, 'Unexpected error', {
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }
    },
  )
}

export interface UpdateProductData {
  name?: string
  brand?: string
  category_id?: string
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
  shelf_life_override_days?: number | null
}

export async function updateProduct(
  productId: string,
  updates: UpdateProductData,
  storeId: string,
): Promise<Product> {
  const supabase = createClient()
  const context = 'updateProduct'

  return withPerformanceTracking(context, 'Update product', { productId, storeId }, async () => {
    try {
      const globalUpdates: Record<string, unknown> = {}
      const storeUpdates: Record<string, unknown> = {}

      if (updates.name !== undefined) globalUpdates.name = updates.name
      if (updates.brand !== undefined) globalUpdates.brand = updates.brand
      if (updates.category_id !== undefined) globalUpdates.category_id = updates.category_id
      if (updates.description !== undefined) globalUpdates.description = updates.description
      if (updates.image_url !== undefined) globalUpdates.image_url = updates.image_url
      if (updates.typical_shelf_life_days !== undefined)
        globalUpdates.typical_shelf_life_days = updates.typical_shelf_life_days
      if (updates.base_cost_price !== undefined)
        globalUpdates.base_cost_price = updates.base_cost_price
      if (updates.base_selling_price !== undefined)
        globalUpdates.base_selling_price = updates.base_selling_price

      if (updates.cost_price !== undefined) storeUpdates.cost_price = updates.cost_price
      if (updates.selling_price !== undefined) storeUpdates.selling_price = updates.selling_price
      if (updates.is_active !== undefined) storeUpdates.is_active = updates.is_active
      if (updates.store_sku !== undefined) storeUpdates.store_sku = updates.store_sku
      if (updates.supplier_code !== undefined) storeUpdates.supplier_code = updates.supplier_code
      if (updates.shelf_life_override_days !== undefined)
        storeUpdates.shelf_life_override_days = updates.shelf_life_override_days

      if (Object.keys(globalUpdates).length > 0) {
        globalUpdates.updated_at = new Date().toISOString()

        const { error } = await supabase
          .schema('inventory')
          .from('products')
          .update(globalUpdates)
          .eq('product_id', productId)

        if (error) {
          logger.queryWarn(context, 'Error updating global product', {
            error: error.message,
            code: error.code,
            productId,
          })
          if (error.code === 'PGRST116') {
            throw new Error(`Product with ID "${productId}" not found`)
          }
          if (error.code === '23505') {
            throw new Error(`Another product already uses this SKU`)
          }
          throw new Error(`Failed to update product: ${error.message}`)
        }
      }

      if (Object.keys(storeUpdates).length > 0) {
        storeUpdates.updated_at = new Date().toISOString()

        const { error } = await supabase
          .schema('inventory')
          .from('store_products')
          .update(storeUpdates)
          .eq('product_id', productId)
          .eq('store_id', storeId)

        if (error) {
          logger.queryWarn(context, 'Error updating store product', {
            error: error.message,
            code: error.code,
            productId,
            storeId,
          })
          if (error.code === 'PGRST116') {
            throw new Error(`Product association for store "${storeId}" not found`)
          }
          throw new Error(`Failed to update store product data: ${error.message}`)
        }
      }

      const updatedProduct = await fetchProductById(productId, storeId)

      logger.log(context, 'Product updated successfully', {
        productId,
        storeId,
      })

      return updatedProduct
    } catch (err) {
      logger.queryWarn(context, 'Unexpected error', {
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
  })
}

export async function deleteProduct(productId: string, storeId: string): Promise<void> {
  const supabase = createClient()
  const context = 'deleteProduct'

  return withPerformanceTracking(context, 'Delete product', { productId, storeId }, async () => {
    try {
      const { data: relatedBatches, error: batchError } = await supabase
        .schema('inventory')
        .from('batches')
        .select('batch_id')
        .eq('product_id', productId)
        .eq('store_id', storeId)
        .limit(1)

      if (batchError) {
        logger.queryWarn(context, 'Error checking batches', {
          error: batchError.message,
          code: batchError.code,
          productId,
          storeId,
        })
        throw new Error(`Failed to check related batches: ${batchError.message}`)
      }

      if (relatedBatches && relatedBatches.length > 0) {
        throw new Error('Cannot delete product that has associated batches. Delete batches first.')
      }

      const { error: storeProductError } = await supabase
        .schema('inventory')
        .from('store_products')
        .delete()
        .eq('product_id', productId)
        .eq('store_id', storeId)

      if (storeProductError) {
        logger.queryWarn(context, 'Error deleting store-product association', {
          error: storeProductError.message,
          code: storeProductError.code,
          productId,
          storeId,
        })
        throw new Error(`Failed to remove product from store: ${storeProductError.message}`)
      }

      logger.log(context, 'Product deleted successfully', {
        productId,
        storeId,
      })
    } catch (err) {
      logger.queryWarn(context, 'Unexpected error', {
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
  })
}

export async function fetchCategories(serverClient?: ServerClient): Promise<Category[]> {
  const supabase = serverClient || createClient()
  const context = 'fetchCategories'

  return withPerformanceTracking(context, 'Fetch categories', {}, async () => {
    try {
      const { data: categories, error } = await supabase
        .schema('inventory')
        .rpc('get_categories_for_dropdown')

      if (error) {
        logger.queryWarn(context, 'Error fetching categories', {
          error: error.message,
          code: error.code,
        })
        throw new Error(`Failed to fetch categories: ${error.message}`)
      }

      logger.query(context, 'Categories fetched successfully', {
        count: categories?.length || 0,
      })

      return categories || []
    } catch (err) {
      logger.queryWarn(context, 'Unexpected error', {
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
  })
}

/**
 * Updates the default shelf life for a category at a specific store.
 * This is a store-wide setting that applies to all products in the category (unless they have product-specific overrides).
 * Creates a new store_category_settings row if one doesn't exist (upsert).
 */
export async function updateStoreCategoryShelfLife(
  storeId: string,
  categoryId: string,
  shelfLifeDays: number | null,
): Promise<void> {
  const supabase = createClient()
  const context = 'updateStoreCategoryShelfLife'

  // Validate inputs
  if (!storeId || !categoryId) {
    throw new Error('Store ID and Category ID are required')
  }

  if (shelfLifeDays !== null && (shelfLifeDays < 1 || shelfLifeDays > 365)) {
    throw new Error('Shelf life must be between 1 and 365 days')
  }

  return withPerformanceTracking(
    context,
    'Update store category shelf life',
    { storeId, categoryId, shelfLifeDays },
    async () => {
      try {
        // Upsert: Update if exists, insert if not
        const { error } = await supabase.schema('inventory').from('store_category_settings').upsert(
          {
            store_id: storeId,
            category_id: categoryId,
            default_shelf_life_days: shelfLifeDays,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'store_id,category_id',
          },
        )

        if (error) {
          logger.queryWarn(context, 'Error updating store category shelf life', {
            error: error.message,
            code: error.code,
            storeId,
            categoryId,
            shelfLifeDays,
          })
          throw new Error(`Failed to update category shelf life: ${error.message}`)
        }

        logger.log(context, 'Store category shelf life updated successfully', {
          storeId,
          categoryId,
          shelfLifeDays,
        })
      } catch (err) {
        logger.queryWarn(context, 'Unexpected error', {
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }
    },
  )
}

export async function fetchProductById(
  productId: string,
  storeId: string,
  serverClient?: ServerClient,
): Promise<Product> {
  const supabase = serverClient || createClient()
  const context = 'fetchProductById'

  return withPerformanceTracking(
    context,
    'Fetch product by ID',
    { productId, storeId },
    async () => {
      try {
        const { data, error } = await supabase.schema('inventory').rpc('get_product_detail', {
          p_product_id: productId,
          p_store_id: storeId,
        })

        if (error) {
          logger.queryWarn(context, 'RPC failed', {
            error: error.message,
            code: error.code,
            productId,
            storeId,
          })
          throw new Error(`Failed to fetch product: ${error.message}`)
        }

        type ProductDetailRow =
          Database['inventory']['Functions']['get_product_detail']['Returns'][number]

        // RPC returns a table — expect exactly one row
        const row: ProductDetailRow | null = Array.isArray(data) ? (data[0] ?? null) : null
        if (!row) {
          throw new Error(`Product with ID "${productId}" not found in store "${storeId}"`)
        }

        // Calculate effective shelf life and source (4-tier fallback)
        const productOverride = row.shelf_life_override_days
        const storeCategoryOverride = row.category_default_shelf_life_days
        const productBase = row.typical_shelf_life_days
        const categoryBase = row.category_typical_shelf_life_days
        const defaultFallback = 14

        let effectiveShelfLife: number
        let shelfLifeSource: Product['shelf_life_source']

        if (productOverride != null && productOverride > 0) {
          effectiveShelfLife = productOverride
          shelfLifeSource = 'product_override'
        } else if (storeCategoryOverride != null && storeCategoryOverride > 0) {
          effectiveShelfLife = storeCategoryOverride
          shelfLifeSource = 'store_category_override'
        } else if (productBase != null && productBase > 0) {
          effectiveShelfLife = productBase
          shelfLifeSource = 'product_base'
        } else if (categoryBase != null && categoryBase > 0) {
          effectiveShelfLife = categoryBase
          shelfLifeSource = 'category_base'
        } else {
          effectiveShelfLife = defaultFallback
          shelfLifeSource = 'default'
        }

        // Infer tracking mode from configuration presence
        // If product or category has shelf life configured → auto mode
        // If no shelf life anywhere → manual mode (user enters dates manually)
        const trackingMode: 'auto' | 'manual' =
          productOverride != null ||
          storeCategoryOverride != null ||
          productBase != null ||
          categoryBase != null
            ? 'auto'
            : 'manual'

        const product = {
          ...row,
          effective_shelf_life: effectiveShelfLife,
          shelf_life_source: shelfLifeSource,
          tracking_mode: trackingMode,
          avg_days_to_expiry: null,
        } as unknown as Product

        logger.query(context, 'Product fetched successfully via RPC', {
          productId,
          storeId,
          batchQuantity: row.batch_quantity,
          activeBatches: row.active_batches_count,
          effectiveShelfLife,
          shelfLifeSource,
          trackingMode,
        })

        return product
      } catch (err) {
        logger.queryWarn(context, 'Unexpected error', {
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }
    },
  )
}

export async function fetchProductWithBatches(
  productId: string,
  storeId: string,
): Promise<{ product: Product; batches: BatchWithProduct[] }> {
  const supabase = createClient()
  const context = 'fetchProductWithBatches'

  return withPerformanceTracking(
    context,
    'Fetch product with batches',
    { productId, storeId },
    async () => {
      try {
        const { data, error } = await supabase.schema('inventory').rpc('get_product_with_batches', {
          p_product_id: productId,
          p_store_id: storeId,
        })

        if (error) {
          logger.queryWarn(context, 'RPC failed', {
            error: error.message,
            code: error.code,
            productId,
            storeId,
          })
          throw new Error(`Failed to fetch product with batches: ${error.message}`)
        }

        type ProductWithBatchesRow =
          Database['inventory']['Functions']['get_product_with_batches']['Returns'][number]

        const row: ProductWithBatchesRow | null = Array.isArray(data) ? (data[0] ?? null) : null
        if (!row) {
          throw new Error(`Product with ID "${productId}" not found in store "${storeId}"`)
        }

        // Calculate effective shelf life and source (4-tier fallback)
        const productOverride = row.shelf_life_override_days
        const storeCategoryOverride = row.category_default_shelf_life_days
        const productBase = row.typical_shelf_life_days
        const categoryBase = row.category_typical_shelf_life_days
        const defaultFallback = 14

        let effectiveShelfLife: number
        let shelfLifeSource: Product['shelf_life_source']

        if (productOverride != null && productOverride > 0) {
          effectiveShelfLife = productOverride
          shelfLifeSource = 'product_override'
        } else if (storeCategoryOverride != null && storeCategoryOverride > 0) {
          effectiveShelfLife = storeCategoryOverride
          shelfLifeSource = 'store_category_override'
        } else if (productBase != null && productBase > 0) {
          effectiveShelfLife = productBase
          shelfLifeSource = 'product_base'
        } else if (categoryBase != null && categoryBase > 0) {
          effectiveShelfLife = categoryBase
          shelfLifeSource = 'category_base'
        } else {
          effectiveShelfLife = defaultFallback
          shelfLifeSource = 'default'
        }

        const trackingMode: 'auto' | 'manual' =
          productOverride != null ||
          storeCategoryOverride != null ||
          productBase != null ||
          categoryBase != null
            ? 'auto'
            : 'manual'

        const product = {
          ...row,
          effective_shelf_life: effectiveShelfLife,
          shelf_life_source: shelfLifeSource,
          tracking_mode: trackingMode,
          avg_days_to_expiry: null,
        } as unknown as Product

        // Typed intermediate narrows the Json type to the fields the RPC actually returns.
        // If the SQL in get_product_with_batches changes, update this type to match.
        type RpcBatchJson = Pick<
          BatchWithProduct,
          | 'batch_id'
          | 'product_id'
          | 'store_id'
          | 'batch_number'
          | 'status'
          | 'expiry_date'
          | 'manufacture_date'
          | 'received_date'
          | 'current_quantity'
          | 'reserved_quantity'
          | 'cost_price'
          | 'selling_price'
          | 'location_code'
          | 'supplier'
          | 'created_at'
          | 'updated_at'
        >
        const batches = (row.batches ?? []) as RpcBatchJson[] as BatchWithProduct[]

        logger.query(context, 'Product with batches fetched successfully via RPC', {
          productId,
          storeId,
          batchCount: batches.length,
          effectiveShelfLife,
          shelfLifeSource,
          trackingMode,
        })

        return { product, batches }
      } catch (err) {
        logger.queryWarn(context, 'Unexpected error', {
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }
    },
  )
}
