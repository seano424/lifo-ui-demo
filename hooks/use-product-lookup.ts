import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  openFoodFactsClient,
  type ProductLookupResult,
  transformOpenFoodFactsProduct,
} from '@/lib/queries/open-food-facts'
import { queryKeys } from '@/lib/queries/query-keys'
import { createClient } from '@/lib/supabase/client'

// Constants
const LOOKUP_CONFIG = {
  MIN_BARCODE_LENGTH: 8,
  MIN_SEARCH_LENGTH: 3,
  CACHE_STALE_TIME: 24 * 60 * 60 * 1000, // 24 hours
  CACHE_GC_TIME: 7 * 24 * 60 * 60 * 1000, // 7 days
  MAX_SEARCH_RESULTS: 20,
  RETRY_COUNT: 1,
} as const

// Types
export interface SupabaseProductSearchResult {
  product_id: string
  name: string
  brand?: string
  category?: string
  barcode?: string
  image_url?: string
  unit_type?: string
  total_available_quantity?: number
  batch_count?: number
  isOutOfStock?: boolean
}

interface RpcLookupResult {
  found: boolean
  product_data?: unknown
  source?: string
  cached_at?: string
}

// Utilities
function parseFirstCategory(categories: unknown): string | null {
  if (!categories) return null
  try {
    const categoryStr = String(categories)
    if (!categoryStr || categoryStr === 'undefined' || categoryStr === 'null') return null
    const firstCategory = categoryStr.split(',')[0]?.trim()
    return firstCategory || null
  } catch {
    return null
  }
}

function isValidCategory(obj: unknown): obj is { display_name_en: string } | null {
  if (obj === null) return true
  if (typeof obj === 'object' && obj !== null) {
    return (
      'display_name_en' in obj &&
      typeof (obj as Record<string, unknown>).display_name_en === 'string'
    )
  }
  return false
}

// Main product lookup hook using optimized RPC function
export function useProductLookup(barcode: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.productLookup.byBarcode(barcode || ''),
    queryFn: async (): Promise<ProductLookupResult> => {
      if (!barcode) {
        throw new Error('No barcode provided')
      }

      const supabase = createClient()

      // Use optimized RPC function that checks cache and products in one call
      const { data: lookupResult, error: rpcError } = await supabase
        .rpc('lookup_product_with_cache', { barcode_param: barcode })
        .single()

      // If RPC function doesn't exist, fall back to manual lookup
      if (rpcError?.code === '42883') {
        return await fallbackProductLookup(barcode, supabase)
      }

      if (rpcError) {
        console.error('[ProductLookup] RPC lookup failed:', rpcError)
        return await fallbackProductLookup(barcode, supabase)
      }

      if (lookupResult && typeof lookupResult === 'object' && 'found' in lookupResult) {
        const result = lookupResult as RpcLookupResult
        if (result.found) {
          return {
            barcode,
            found: true,
            product: result.product_data as ProductLookupResult['product'],
            source: result.source as ProductLookupResult['source'],
            cached_at: result.cached_at,
          }
        }
      }

      // Not found in cache or Supabase, fetch from Open Food Facts
      return await fetchFromOpenFoodFacts(barcode, supabase)
    },
    enabled: enabled && !!barcode && barcode.length >= LOOKUP_CONFIG.MIN_BARCODE_LENGTH,
    staleTime: LOOKUP_CONFIG.CACHE_STALE_TIME,
    gcTime: LOOKUP_CONFIG.CACHE_GC_TIME,
    retry: LOOKUP_CONFIG.RETRY_COUNT,
  })
}

// Fallback function for manual lookup when RPC is not available
async function fallbackProductLookup(
  barcode: string,
  supabase: ReturnType<typeof createClient>,
): Promise<ProductLookupResult> {
  // Check cache first
  const { data: cachedProduct } = await supabase
    .from('product_recognition_cache')
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle()

  if (cachedProduct) {
    return {
      barcode,
      found: true,
      product: cachedProduct.open_food_facts_data,
      source: 'cache',
      cached_at: cachedProduct.last_verified,
    }
  }

  // Check products table
  const { data: supabaseProduct } = await supabase
    .schema('inventory')
    .from('products')
    .select('product_id, name, brand, barcode, image_url, open_food_facts_data, is_verified')
    .eq('barcode', barcode)
    .maybeSingle()

  if (supabaseProduct) {
    const productData = supabaseProduct.open_food_facts_data || {
      _id: supabaseProduct.product_id,
      product_name: supabaseProduct.name,
      brands: supabaseProduct.brand || '',
      image_front_url: supabaseProduct.image_url || '',
      categories: '',
    }

    // Cache in background (don't await)
    supabase.from('product_recognition_cache').upsert({
      barcode,
      product_name: supabaseProduct.name,
      brand: supabaseProduct.brand || null,
      category: parseFirstCategory(productData.categories),
      image_url: supabaseProduct.image_url || null,
      open_food_facts_data: productData,
      is_verified: supabaseProduct.is_verified,
      verification_count: 1,
    })

    return {
      barcode,
      found: true,
      product: productData,
      source: 'supabase',
    }
  }

  // Fetch from Open Food Facts
  return await fetchFromOpenFoodFacts(barcode, supabase)
}

// Open Food Facts lookup with caching
async function fetchFromOpenFoodFacts(
  barcode: string,
  supabase: ReturnType<typeof createClient>,
): Promise<ProductLookupResult> {
  try {
    const offResponse = await openFoodFactsClient.lookupProduct(barcode)
    const result = transformOpenFoodFactsProduct(barcode, offResponse)

    // Cache successful lookups in background (don't await)
    if (result.found && result.product) {
      supabase.from('product_recognition_cache').upsert({
        barcode,
        product_name:
          result.product.product_name || result.product.product_name_en || 'Unknown Product',
        brand: result.product.brands || null,
        category: parseFirstCategory(result.product.categories),
        image_url: result.product.image_front_url || result.product.image_url || null,
        open_food_facts_data: result.product,
        is_verified: false,
        verification_count: 1,
      })
    }

    return result
  } catch (error) {
    console.error('[ProductLookup] Open Food Facts lookup failed:', error)

    // Categorize the error type
    let errorType: ProductLookupResult['errorType'] = 'api_error'
    let errorMessage = 'Failed to lookup product'

    if (error instanceof Error) {
      // Check for network errors
      if (
        (error as Error & { isNetworkError?: boolean }).isNetworkError ||
        error.message.includes('NetworkError') ||
        error.message.includes('Failed to fetch')
      ) {
        errorType = 'network'
        errorMessage = 'Network error - please check your connection and try again'
      }
      // Check for 404 or product not found
      else if ((error as Error & { status?: number }).status === 404) {
        errorType = 'not_found'
        errorMessage = 'Product not found in database'
      }
      // Invalid barcode format
      else if (barcode.length < 8) {
        errorType = 'invalid_barcode'
        errorMessage = 'Invalid barcode format'
      } else {
        errorMessage = error.message
      }
    }

    return {
      barcode,
      found: false,
      error: errorMessage,
      errorType,
      source: 'open_food_facts',
    }
  }
}

// Optimized product search using RPC function
export function useSupabaseProductSearch(storeId?: string) {
  return useMutation({
    mutationFn: async (query: string): Promise<SupabaseProductSearchResult[]> => {
      if (!query || query.length < LOOKUP_CONFIG.MIN_SEARCH_LENGTH - 1) {
        return []
      }

      const supabase = createClient()

      // Try optimized RPC function first
      const { data: rpcResults, error: rpcError } = await supabase.rpc(
        'search_products_with_stock',
        {
          search_query: query,
          store_id_param: storeId || null,
          max_results: LOOKUP_CONFIG.MAX_SEARCH_RESULTS,
        },
      )

      // If RPC function works, use it
      if (!rpcError && rpcResults) {
        return rpcResults.map(
          (row: {
            product_id: string
            name: string
            brand?: string
            category_name?: string
            barcode?: string
            image_url?: string
            unit_type?: string
            total_available_quantity?: number
            batch_count?: number
            is_out_of_stock?: boolean
          }) => ({
            product_id: row.product_id,
            name: row.name,
            brand: row.brand || undefined,
            category: row.category_name || undefined,
            barcode: row.barcode || undefined,
            image_url: row.image_url || undefined,
            unit_type: row.unit_type || undefined,
            total_available_quantity: row.total_available_quantity || undefined,
            batch_count: row.batch_count || undefined,
            isOutOfStock: row.is_out_of_stock || false,
          }),
        )
      }

      // Fallback to manual queries if RPC fails
      console.warn('[SupabaseProductSearch] RPC failed, using fallback:', rpcError?.message)
      return await fallbackProductSearch(query, storeId, supabase)
    },
  })
}

// Fallback product search using correct relationship path
async function fallbackProductSearch(
  query: string,
  storeId: string | undefined,
  supabase: ReturnType<typeof createClient>,
): Promise<SupabaseProductSearchResult[]> {
  if (storeId) {
    // For outbound: Use a simplified approach with two separate queries
    // First get products that match the search
    const { data: matchingProducts, error: productError } = await supabase
      .schema('inventory')
      .from('products')
      .select(
        `
        product_id,
        name,
        brand,
        barcode,
        image_url,
        unit_type,
        categories (
          display_name_en
        )
      `,
      )
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
      .limit(LOOKUP_CONFIG.MAX_SEARCH_RESULTS)

    if (productError) {
      console.error('[SupabaseProductSearch] Product search failed:', productError)
      throw productError
    }

    if (!matchingProducts || matchingProducts.length === 0) {
      return []
    }

    // Get product IDs for stock lookup
    const productIds = matchingProducts.map(p => p.product_id)

    // Now get stock information for these products
    const { data: stockData, error: stockError } = await supabase
      .schema('inventory')
      .from('store_products')
      .select(
        `
        product_id,
        batches (
          current_quantity,
          status
        )
      `,
      )
      .eq('store_id', storeId)
      .eq('is_active', true)
      .in('product_id', productIds)

    if (stockError) {
      console.error('[SupabaseProductSearch] Stock lookup failed:', stockError)
      throw stockError
    }

    // Create a map for quick stock lookups
    const stockMap = new Map<string, { totalQuantity: number; batchCount: number }>()

    for (const storeProduct of stockData || []) {
      const productId = storeProduct.product_id
      const activeBatches = Array.isArray(storeProduct.batches)
        ? storeProduct.batches
        : storeProduct.batches
          ? [storeProduct.batches]
          : []

      let totalQuantity = 0
      let batchCount = 0

      for (const batch of activeBatches) {
        if (batch?.status === 'active' && batch.current_quantity > 0) {
          totalQuantity += batch.current_quantity
          batchCount += 1
        }
      }

      stockMap.set(productId, { totalQuantity, batchCount })
    }

    // Combine product data with stock data
    return matchingProducts
      .map(product => {
        const stock = stockMap.get(product.product_id)
        const categories = isValidCategory(product.categories) ? product.categories : null

        return {
          product_id: product.product_id,
          name: product.name,
          brand: product.brand || undefined,
          category: categories?.display_name_en || undefined,
          barcode: product.barcode || undefined,
          image_url: product.image_url || undefined,
          unit_type: product.unit_type || undefined,
          total_available_quantity: stock?.totalQuantity || 0,
          batch_count: stock?.batchCount || 0,
          isOutOfStock: !stock || stock.totalQuantity === 0,
        }
      })
      .filter(result => !result.isOutOfStock) // Only return products with stock
  } else {
    // For inbound: Simple products search
    const { data, error } = await supabase
      .schema('inventory')
      .from('products')
      .select(
        `
        product_id,
        name,
        brand,
        barcode,
        image_url,
        unit_type,
        categories (
          display_name_en
        )
      `,
      )
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
      .limit(LOOKUP_CONFIG.MAX_SEARCH_RESULTS)

    if (error) {
      console.error('[SupabaseProductSearch] Product search failed:', error)
      throw error
    }

    return (data || []).map(product => {
      const categories = isValidCategory(product.categories) ? product.categories : null
      return {
        product_id: product.product_id,
        name: product.name,
        brand: product.brand || undefined,
        category: categories?.display_name_en || undefined,
        barcode: product.barcode || undefined,
        image_url: product.image_url || undefined,
        unit_type: product.unit_type || undefined,
      }
    })
  }
}

// Open Food Facts search hook
export function useProductSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      if (!query || query.length < LOOKUP_CONFIG.MIN_SEARCH_LENGTH) {
        return []
      }
      return await openFoodFactsClient.searchProducts(query)
    },
  })
}

// Manual cache management hooks
export function useAddProductToCache() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      barcode,
      productName,
      brand,
      category,
      imageUrl,
    }: {
      barcode: string
      productName: string
      brand?: string
      category?: string
      imageUrl?: string
    }) => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('product_recognition_cache')
        .upsert({
          barcode,
          product_name: productName,
          brand: brand || null,
          category: category || null,
          image_url: imageUrl || null,
          open_food_facts_data: {
            product_name: productName,
            brands: brand,
            categories: category,
            image_front_url: imageUrl,
          },
          is_verified: true,
          verification_count: 1,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.productLookup.byBarcode(data.barcode),
      })
    },
  })
}

export function useVerifyProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      barcode,
      isCorrect,
      corrections,
    }: {
      barcode: string
      isCorrect: boolean
      corrections?: {
        product_name?: string
        brand?: string
        category?: string
      }
    }) => {
      const supabase = createClient()

      const updateData: Record<string, unknown> = {
        is_verified: isCorrect,
        verification_count: isCorrect ? 1 : 0,
        last_verified: new Date().toISOString(),
      }

      if (corrections) {
        Object.assign(updateData, corrections)
        updateData.open_food_facts_data = {
          ...(updateData.open_food_facts_data || {}),
          ...corrections,
        }
      }

      const { data, error } = await supabase
        .from('product_recognition_cache')
        .update(updateData)
        .eq('barcode', barcode)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.productLookup.byBarcode(data.barcode),
      })
    },
  })
}
