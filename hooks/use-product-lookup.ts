// hooks/use-product-lookup.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

      // If not cached, fetch from Open Food Facts
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
            category: result.product.categories
              ? String(result.product.categories).split(',')[0]?.trim() || null
              : null,
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
    enabled: enabled && !!barcode && barcode.length >= 8,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    retry: 1,
  })
}

// Hook to search products by name
export function useProductSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      if (!query || query.length < 3) {
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

export function useSupabaseProductSearch(storeId?: string) {
  return useMutation({
    mutationFn: async (query: string): Promise<SupabaseProductSearchResult[]> => {
      if (!query || query.length < 2) {
        return []
      }

      const supabase = createClient()
      
      // For outbound (when storeId is provided), search BATCHES with available stock
      if (storeId) {
        // First get products that match the search query
        const { data: matchingProducts, error: productError } = await supabase
          .schema('inventory')
          .from('products')
          .select('product_id, name, brand, category, barcode, image_url, unit_type')
          .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)

        if (productError) {
          console.error('[SupabaseProductSearch] Failed to search products:', productError)
          throw productError
        }

        if (!matchingProducts || matchingProducts.length === 0) {
          return []
        }

        const productIds = matchingProducts.map(p => p.product_id)

        // Now get ALL batches for these products (including out of stock)
        const { data: batchesWithProducts, error } = await supabase
          .schema('inventory')
          .from('batches')
          .select(`
            batch_id,
            product_id,
            current_quantity,
            products (
              product_id,
              name,
              brand,
              category,
              barcode,
              image_url,
              unit_type
            )
          `)
          .eq('store_id', storeId)
          .eq('status', 'active')
          .gte('current_quantity', 0) // Include items with 0 stock
          .in('product_id', productIds)

        if (error) {
          console.error('[SupabaseProductSearch] Failed to search batches:', error)
          throw error
        }

        // Aggregate batches by product
        const productMap = new Map<string, SupabaseProductSearchResult>()
        
        batchesWithProducts?.forEach(batch => {
          const product = batch.products as any
          const productId = batch.product_id
          
          if (productMap.has(productId)) {
            // Update existing product entry with additional batch quantity
            const existing = productMap.get(productId)!
            existing.total_available_quantity = (existing.total_available_quantity || 0) + batch.current_quantity
            existing.batch_count = (existing.batch_count || 0) + 1
          } else {
            // Create new product entry
            productMap.set(productId, {
              product_id: productId,
              name: product.name,
              brand: product.brand,
              category: product.category,
              barcode: product.barcode,
              image_url: product.image_url,
              unit_type: product.unit_type,
              total_available_quantity: batch.current_quantity,
              batch_count: 1,
              isOutOfStock: batch.current_quantity === 0
            })
          }
        })

        // Add products that have no batches in this store (completely out of stock)
        matchingProducts.forEach(product => {
          if (!productMap.has(product.product_id)) {
            productMap.set(product.product_id, {
              product_id: product.product_id,
              name: product.name,
              brand: product.brand,
              category: product.category,
              barcode: product.barcode,
              image_url: product.image_url,
              unit_type: product.unit_type,
              total_available_quantity: 0,
              batch_count: 0,
              isOutOfStock: true
            })
          }
        })

        // Update isOutOfStock flag for products with zero total quantity
        productMap.forEach(product => {
          if ((product.total_available_quantity || 0) === 0) {
            product.isOutOfStock = true
          }
        })

        // Convert to array and sort: in-stock items first, then out-of-stock
        const results = Array.from(productMap.values())
          .sort((a, b) => {
            // First sort by stock status (in-stock items first)
            if (a.isOutOfStock !== b.isOutOfStock) {
              return a.isOutOfStock ? 1 : -1
            }
            // Then sort by total available quantity (highest first)
            return (b.total_available_quantity || 0) - (a.total_available_quantity || 0)
          })
          .slice(0, 20)

        const inStockCount = results.filter(p => !p.isOutOfStock).length
        const outOfStockCount = results.length - inStockCount
        console.log(`[SupabaseProductSearch] Found ${results.length} products for query "${query}" in store ${storeId} (${inStockCount} in stock, ${outOfStockCount} out of stock)`)
        return results

      } else {
        // For inbound (no storeId), show all products regardless of stock
        // This is for adding new inventory
        const { data, error } = await supabase
          .schema('inventory')
          .from('products')
          .select('product_id, name, brand, category, barcode, image_url, unit_type')
          .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
          .limit(20)

        if (error) {
          console.error('[SupabaseProductSearch] Failed to search products:', error)
          throw error
        }

        return data || []
      }
    },
  })
}
