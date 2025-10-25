/**
 * Tests for Open Food Facts client error handling
 *
 * This test suite verifies that the Open Food Facts API client correctly:
 * - Handles network errors (CORS, service worker issues, etc.)
 * - Handles 404 responses for products not found
 * - Handles invalid responses from the API
 * - Transforms product data correctly when found
 * - Categorizes errors with proper error types
 */

import { openFoodFactsClient, transformOpenFoodFactsProduct } from '@/lib/queries/open-food-facts'
import type { OpenFoodFactsProduct } from '@/lib/queries/open-food-facts'

// Mock logger to avoid console spam during tests
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('Open Food Facts Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('lookupProduct', () => {
    const testBarcode = '0813602026657'

    it('should successfully fetch product data', async () => {
      const mockResponse: OpenFoodFactsProduct = {
        code: testBarcode,
        status: 1,
        status_verbose: 'product found',
        product: {
          _id: testBarcode,
          product_name: 'Test Product',
          brands: 'Test Brand',
          categories: 'Test Category',
          image_front_url: 'https://example.com/image.jpg',
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await openFoodFactsClient.lookupProduct(testBarcode)

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        `https://world.openfoodfacts.org/api/v0/product/${testBarcode}.json`,
        expect.objectContaining({
          mode: 'cors',
          headers: expect.objectContaining({
            'User-Agent': 'LIFO-FoodWasteApp/1.0 (contact@lifo-app.com)',
            Accept: 'application/json',
          }),
        }),
      )
    })

    it('should throw enhanced network error on TypeError', async () => {
      const networkError = new TypeError('NetworkError when attempting to fetch resource.')
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(networkError)

      await expect(openFoodFactsClient.lookupProduct(testBarcode)).rejects.toThrow(
        'Network error - unable to reach Open Food Facts API',
      )
    })

    it('should throw error on HTTP 404', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(openFoodFactsClient.lookupProduct(testBarcode)).rejects.toThrow(
        'HTTP 404: Not Found',
      )
    })

    it('should throw error on HTTP 500', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(openFoodFactsClient.lookupProduct(testBarcode)).rejects.toThrow(
        'HTTP 500: Internal Server Error',
      )
    })

    it('should handle CORS errors', async () => {
      const corsError = new TypeError('Failed to fetch')
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(corsError)

      await expect(openFoodFactsClient.lookupProduct(testBarcode)).rejects.toThrow()
    })
  })

  describe('transformOpenFoodFactsProduct', () => {
    const testBarcode = '0813602026657'

    it('should transform product when found with complete data', () => {
      const offProduct: OpenFoodFactsProduct = {
        code: testBarcode,
        status: 1,
        status_verbose: 'product found',
        product: {
          _id: testBarcode,
          product_name: 'Test Product',
          brands: 'Test Brand',
          categories: 'Test Category',
          image_front_url: 'https://example.com/image.jpg',
        },
      }

      const result = transformOpenFoodFactsProduct(testBarcode, offProduct)

      expect(result).toEqual({
        barcode: testBarcode,
        found: true,
        product: offProduct.product,
        source: 'open_food_facts',
      })
      expect(result.error).toBeUndefined()
      expect(result.errorType).toBeUndefined()
    })

    it('should return not_found error when status is 0', () => {
      const offProduct: OpenFoodFactsProduct = {
        code: testBarcode,
        status: 0,
        status_verbose: 'product not found',
      }

      const result = transformOpenFoodFactsProduct(testBarcode, offProduct)

      expect(result).toEqual({
        barcode: testBarcode,
        found: false,
        error: 'Product not found in Open Food Facts database',
        errorType: 'not_found',
        source: 'open_food_facts',
      })
    })

    it('should return not_found error when product has no name', () => {
      const offProduct: OpenFoodFactsProduct = {
        code: testBarcode,
        status: 1,
        status_verbose: 'product found',
        product: {
          _id: testBarcode,
          brands: 'Test Brand',
        },
      }

      const result = transformOpenFoodFactsProduct(testBarcode, offProduct)

      expect(result).toEqual({
        barcode: testBarcode,
        found: false,
        error: 'Product found but has no meaningful name',
        errorType: 'not_found',
        source: 'open_food_facts',
      })
    })

    it('should return not_found error when product name is empty string', () => {
      const offProduct: OpenFoodFactsProduct = {
        code: testBarcode,
        status: 1,
        status_verbose: 'product found',
        product: {
          _id: testBarcode,
          product_name: '',
          brands: 'Test Brand',
        },
      }

      const result = transformOpenFoodFactsProduct(testBarcode, offProduct)

      expect(result).toEqual({
        barcode: testBarcode,
        found: false,
        error: 'Product found but has no meaningful name',
        errorType: 'not_found',
        source: 'open_food_facts',
      })
    })

    it('should accept product_name_en as fallback', () => {
      const offProduct: OpenFoodFactsProduct = {
        code: testBarcode,
        status: 1,
        status_verbose: 'product found',
        product: {
          _id: testBarcode,
          product_name_en: 'Test Product EN',
          brands: 'Test Brand',
        },
      }

      const result = transformOpenFoodFactsProduct(testBarcode, offProduct)

      expect(result.found).toBe(true)
      expect(result.error).toBeUndefined()
      expect(result.product?.product_name_en).toBe('Test Product EN')
    })
  })

  describe('searchProducts', () => {
    it('should search products by query', async () => {
      const mockSearchResults = {
        products: [
          {
            code: '123456',
            product_name: 'Product 1',
            brands: 'Brand 1',
            image_front_small_url: 'https://example.com/1.jpg',
          },
          {
            code: '789012',
            product_name: 'Product 2',
            brands: 'Brand 2',
            image_front_small_url: 'https://example.com/2.jpg',
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults,
      })

      const results = await openFoodFactsClient.searchProducts('test query')

      expect(results).toEqual(mockSearchResults.products)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search_terms=test%20query'),
      )
    })

    it('should handle search errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(openFoodFactsClient.searchProducts('test')).rejects.toThrow()
    })

    it('should return empty array when no products found', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      })

      const results = await openFoodFactsClient.searchProducts('nonexistent')

      expect(results).toEqual([])
    })
  })
})
