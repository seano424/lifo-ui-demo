// lib/queries/open-food-facts.ts

// Type for search results from Open Food Facts
export interface OpenFoodFactsSearchResult {
  code: string
  product_name?: string
  brands?: string
  image_front_small_url?: string
  quantity?: string
}

export interface OpenFoodFactsProduct {
  code: string
  status: number
  status_verbose: string
  product?: {
    _id: string
    product_name?: string
    product_name_en?: string
    brands?: string
    categories?: string
    image_url?: string
    image_front_url?: string
    image_front_small_url?: string
    quantity?: string
    serving_size?: string
    nutrition_grades?: string
    nova_group?: number
    ecoscore_grade?: string
    countries_tags?: string[]
    ingredients_text?: string
    allergens?: string
    traces?: string
    nutriments?: {
      energy_100g?: number
      fat_100g?: number
      'saturated-fat_100g'?: number
      carbohydrates_100g?: number
      sugars_100g?: number
      fiber_100g?: number
      proteins_100g?: number
      salt_100g?: number
    }
    packaging?: string
    packaging_tags?: string[]
    labels?: string
    labels_tags?: string[]
    origins?: string
    manufacturing_places?: string
    expiration_date?: string
    best_before_date?: string
    last_modified_t?: number
  }
}

export interface ProductLookupResult {
  barcode: string
  found: boolean
  product?: OpenFoodFactsProduct['product']
  error?: string
  source: 'open_food_facts' | 'cache'
  cached_at?: string
}

// API client for Open Food Facts
class OpenFoodFactsClient {
  private baseUrl = 'https://world.openfoodfacts.org/api/v0/product'

  async lookupProduct(barcode: string): Promise<OpenFoodFactsProduct> {
    try {
      const response = await fetch(`${this.baseUrl}/${barcode}.json`, {
        mode: 'cors',
        headers: {
          'User-Agent': 'LIFO-FoodWasteApp/1.0 (contact@lifo-app.com)',
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`[OpenFoodFacts] API Response for ${barcode}:`, data)
      return data
    } catch (error) {
      console.error(`[OpenFoodFacts] Failed to lookup ${barcode}:`, error)
      throw error
    }
  }

  // Search products by name (for manual entry fallback)
  async searchProducts(query: string, limit: number = 20): Promise<OpenFoodFactsSearchResult[]> {
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=${limit}&fields=code,product_name,brands,image_front_small_url,quantity`,
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.products || []
    } catch (error) {
      console.error(`[OpenFoodFacts] Failed to search for "${query}":`, error)
      throw error
    }
  }
}

export const openFoodFactsClient = new OpenFoodFactsClient()

// Transform Open Food Facts data to our format
export function transformOpenFoodFactsProduct(
  barcode: string,
  offProduct: OpenFoodFactsProduct,
): ProductLookupResult {
  console.log(`[OpenFoodFacts] Transform for ${barcode}:`, {
    status: offProduct.status,
    hasProduct: !!offProduct.product,
    productName: offProduct.product?.product_name,
  })

  if (offProduct.status !== 1 || !offProduct.product) {
    console.log(`[OpenFoodFacts] Product not found for ${barcode} - status: ${offProduct.status}`)
    return {
      barcode,
      found: false,
      error: 'Product not found in Open Food Facts database',
      source: 'open_food_facts',
    }
  }

  console.log(`[OpenFoodFacts] Product found for ${barcode}:`, offProduct.product.product_name)
  return {
    barcode,
    found: true,
    product: offProduct.product,
    source: 'open_food_facts',
  }
}
