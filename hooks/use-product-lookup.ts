// hooks/use-product-lookup.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'
import {
  openFoodFactsClient,
  transformOpenFoodFactsProduct,
  type ProductLookupResult,
} from '@/lib/queries/open-food-facts'
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
            category: result.product.categories ? String(result.product.categories).split(',')[0]?.trim() || null : null,
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

      const updateData: any = {
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
          ...updateData.open_food_facts_data,
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
