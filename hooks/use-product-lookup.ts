// hooks/use-product-lookup.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Constants
const LOOKUP_CONFIG = {
  MIN_BARCODE_LENGTH: 8,
  MIN_SEARCH_LENGTH: 3,
  CACHE_STALE_TIME: 24 * 60 * 60 * 1000, // 24 hours
  CACHE_GC_TIME: 7 * 24 * 60 * 60 * 1000, // 7 days
  MAX_SEARCH_RESULTS: 20,
  RETRY_COUNT: 1,
} as const

import {
  openFoodFactsClient,
  type ProductLookupResult,
  transformOpenFoodFactsProduct,
} from '@/lib/queries/open-food-facts'
import { queryKeys } from '@/lib/queries/query-keys'
import { createClient } from '@/lib/supabase/client'

// Hook to lookup product by barcode with caching
export function useProductLookup(barcode: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.productLookup.byBarcode(barcode || ''),
    queryFn: async (): Promise<ProductLookupResult> => {
      if (!barcode) {
        throw new Error('No barcode provided')
      }

      // First, check our cache
      const supabase = createClient()
      const { data: cachedProduct } = await supabase
        .from('product_recognition_cache')
        .select('*')
        .eq('barcode', barcode)
        .single()

      if (cachedProduct) {
        return {
          barcode,
          found: true,
          product: cachedProduct.open_food_facts_data,
          source: 'cache',
          cached_at: cachedProduct.last_verified,
        }
      }

      // If not cached, check our Supabase products database first
      const { data: supabaseProduct, error: supabaseError } = await supabase
        .schema('inventory')
        .from('products')
        .select('product_id, name, brand, barcode, image_url, open_food_facts_data, is_verified')
        .eq('barcode', barcode)
        .single()

      if (supabaseError && supabaseError.code !== 'PGRST116') {
        console.error('[ProductLookup] Supabase query error:', supabaseError)
      }

      if (supabaseProduct) {
        // If we have Open Food Facts data, use it
        if (supabaseProduct.open_food_facts_data) {
          // Cache the Supabase product for future lookups
          await supabase.from('product_recognition_cache').upsert({
            barcode,
            product_name: supabaseProduct.name,
            brand: supabaseProduct.brand || null,
            category: parseFirstCategory(supabaseProduct.open_food_facts_data.categories),
            image_url: supabaseProduct.image_url || null,
            open_food_facts_data: supabaseProduct.open_food_facts_data,
            is_verified: supabaseProduct.is_verified,
            verification_count: 1,
          })

          return {
            barcode,
            found: true,
            product: supabaseProduct.open_food_facts_data,
            source: 'supabase',
          }
        } else {
          // If no Open Food Facts data, create a minimal product structure
          const minimalProduct = {
            _id: supabaseProduct.product_id,
            product_name: supabaseProduct.name,
            brands: supabaseProduct.brand || '',
            image_front_url: supabaseProduct.image_url || '',
            categories: '',
          }

          // Cache the minimal product
          await supabase.from('product_recognition_cache').upsert({
            barcode,
            product_name: supabaseProduct.name,
            brand: supabaseProduct.brand || null,
            category: null,
            image_url: supabaseProduct.image_url || null,
            open_food_facts_data: minimalProduct,
            is_verified: supabaseProduct.is_verified,
            verification_count: 1,
          })

          return {
            barcode,
            found: true,
            product: minimalProduct,
            source: 'supabase',
          }
        }
      }

      // If not in Supabase either, fetch from Open Food Facts
      try {
        const offResponse = await openFoodFactsClient.lookupProduct(barcode)
        const result = transformOpenFoodFactsProduct(barcode, offResponse)

        // Cache successful lookups
        if (result.found && result.product) {
          await supabase.from('product_recognition_cache').upsert({
            barcode,
            product_name:
              result.product.product_name || result.product.product_name_en || 'Unknown Product',
            brand: result.product.brands || null,
            category: parseFirstCategory(result.product.categories),
            image_url: result.product.image_front_url || result.product.image_url || null,
            open_food_facts_data: result.product,
            typical_shelf_life_days: null, // We'll estimate this later
            is_verified: false,
            verification_count: 1,
          })
        }

        return result
      } catch (error) {
        console.error('Product lookup failed:', error)
        return {
          barcode,
          found: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          source: 'open_food_facts',
        }
      }
    },
    enabled: enabled && !!barcode && barcode.length >= LOOKUP_CONFIG.MIN_BARCODE_LENGTH,
    staleTime: LOOKUP_CONFIG.CACHE_STALE_TIME,
    gcTime: LOOKUP_CONFIG.CACHE_GC_TIME,
    retry: LOOKUP_CONFIG.RETRY_COUNT,
  })
}

// Hook to search products by name
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

// Hook to manually add product to cache
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
          is_verified: true, // Manual entries are considered verified
          verification_count: 1,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: data => {
      // Invalidate and update the cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.productLookup.byBarcode(data.barcode),
      })
    },
  })
}

// Hook to verify and update cached product
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
        updateData.product_name = corrections.product_name
        updateData.brand = corrections.brand
        updateData.category = corrections.category

        // Update the open_food_facts_data as well
        updateData.open_food_facts_data = {
          ...(updateData.open_food_facts_data || {}),
          product_name: corrections.product_name,
          brands: corrections.brand,
          categories: corrections.category,
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
      // Invalidate the product lookup cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.productLookup.byBarcode(data.barcode),
      })
    },
  })
}

// Type guard for category data
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

// Safe category parser utility
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

// Hook to search products by name in Supabase (for outbound/scan-out)
// For outbound: searches batches with available stock
// For inbound: searches all products
export interface SupabaseProductSearchResult {
  product_id: string
  name: string
  brand?: string
  category?: string
  barcode?: string
  image_url?: string
  unit_type?: string
  total_available_quantity?: number // Total available across all batches
  batch_count?: number // Number of batches available
  isOutOfStock?: boolean // True if no stock available
}

export function useSupabaseProductSearch(_storeId?: string) {
  return useMutation({
    mutationFn: async (query: string): Promise<SupabaseProductSearchResult[]> => {
      if (!query || query.length < LOOKUP_CONFIG.MIN_SEARCH_LENGTH - 1) {
        return []
      }

      const supabase = createClient()

      // Search products directly - simpler approach for both inbound and outbound
      const { data, error } = await supabase
        .schema('inventory')
        .from('products')
        .select(`
          product_id, 
          name, 
          brand, 
          barcode, 
          image_url, 
          unit_type,
          categories (
            display_name_en
          )
        `)
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
        .limit(LOOKUP_CONFIG.MAX_SEARCH_RESULTS)

      if (error) {
        console.error('[SupabaseProductSearch] Failed to search products:', error)
        throw error
      }

      // Transform the results to include category name
      const results = (data || []).map(product => {
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

      return results
    },
  })
}
