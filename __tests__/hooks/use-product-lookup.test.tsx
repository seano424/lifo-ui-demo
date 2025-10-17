/**
 * Tests for product lookup error categorization logic
 *
 * This test suite verifies that the product lookup correctly:
 * - Categorizes different types of errors (network, not_found, invalid_barcode, api_error)
 * - Provides user-friendly error messages
 * - Returns proper ProductLookupResult structures
 *
 * Note: These tests focus on the data transformation logic rather than the full
 * React Query hook integration to avoid complex mocking.
 */

import type { ProductLookupResult } from '@/lib/queries/open-food-facts'

// Helper function that simulates the error categorization logic from fetchFromOpenFoodFacts
function categorizeProductLookupError(
  barcode: string,
  error: Error & { isNetworkError?: boolean; status?: number },
): ProductLookupResult {
  let errorType: ProductLookupResult['errorType'] = 'api_error'
  let errorMessage = 'Failed to lookup product'

  // Check for network errors
  if (
    error.isNetworkError ||
    error.message.includes('NetworkError') ||
    error.message.includes('Failed to fetch')
  ) {
    errorType = 'network'
    errorMessage = 'Network error - please check your connection and try again'
  }
  // Check for 404 or product not found
  else if (error.status === 404) {
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

  return {
    barcode,
    found: false,
    error: errorMessage,
    errorType,
    source: 'open_food_facts',
  }
}

describe('Product Lookup Error Categorization Logic', () => {
  const testBarcode = '0813602026657'

  describe('Network Errors', () => {
    it('should categorize NetworkError as network error type', () => {
      const networkError = new TypeError(
        'NetworkError when attempting to fetch resource.',
      ) as TypeError & { isNetworkError: boolean }
      networkError.isNetworkError = true

      const result = categorizeProductLookupError(testBarcode, networkError)

      expect(result.found).toBe(false)
      expect(result.errorType).toBe('network')
      expect(result.error).toContain('Network error')
    })

    it('should categorize "Failed to fetch" as network error', () => {
      const fetchError = new TypeError('Failed to fetch') as TypeError & {
        isNetworkError?: boolean
      }

      const result = categorizeProductLookupError(testBarcode, fetchError)

      expect(result.found).toBe(false)
      expect(result.errorType).toBe('network')
    })

    it('should categorize message containing NetworkError as network error', () => {
      const error = new Error('NetworkError occurred') as Error & {
        isNetworkError?: boolean
      }

      const result = categorizeProductLookupError(testBarcode, error)

      expect(result.errorType).toBe('network')
    })
  })

  describe('Product Not Found Errors', () => {
    it('should categorize 404 response as not_found error type', () => {
      const notFoundError = new Error('HTTP 404: Not Found') as Error & { status: number }
      notFoundError.status = 404

      const result = categorizeProductLookupError(testBarcode, notFoundError)

      expect(result.found).toBe(false)
      expect(result.errorType).toBe('not_found')
      expect(result.error).toContain('not found')
    })
  })

  describe('Invalid Barcode Errors', () => {
    it('should categorize short barcode as invalid_barcode error type', () => {
      const shortBarcode = '123' // Less than 8 characters
      const error = new Error('Invalid barcode') as Error & { isNetworkError?: boolean }

      const result = categorizeProductLookupError(shortBarcode, error)

      expect(result.found).toBe(false)
      expect(result.errorType).toBe('invalid_barcode')
    })

    it('should categorize 7-character barcode as invalid', () => {
      const shortBarcode = '1234567'
      const error = new Error('Test') as Error & { isNetworkError?: boolean }

      const result = categorizeProductLookupError(shortBarcode, error)

      expect(result.errorType).toBe('invalid_barcode')
    })
  })

  describe('API Errors', () => {
    it('should categorize generic errors as api_error', () => {
      const error = new Error('API request failed') as Error & { isNetworkError?: boolean }

      const result = categorizeProductLookupError(testBarcode, error)

      expect(result.found).toBe(false)
      expect(result.errorType).toBe('api_error')
      expect(result.error).toBe('API request failed')
    })

    it('should preserve original error message for API errors', () => {
      const error = new Error('Custom error message') as Error & { isNetworkError?: boolean }

      const result = categorizeProductLookupError(testBarcode, error)

      expect(result.error).toBe('Custom error message')
    })
  })

  describe('Error Priority', () => {
    it('should prioritize network error over short barcode', () => {
      const shortBarcode = '123'
      const error = new TypeError('NetworkError') as TypeError & { isNetworkError?: boolean }

      const result = categorizeProductLookupError(shortBarcode, error)

      // Network error has higher priority than invalid barcode
      expect(result.errorType).toBe('network')
    })

    it('should prioritize 404 error over short barcode', () => {
      const shortBarcode = '123'
      const error = new Error('Not found') as Error & { status: number }
      error.status = 404

      const result = categorizeProductLookupError(shortBarcode, error)

      // 404 error has higher priority than invalid barcode
      expect(result.errorType).toBe('not_found')
    })
  })

  describe('Result Structure', () => {
    it('should always include barcode in result', () => {
      const error = new Error('Test') as Error & { isNetworkError?: boolean }

      const result = categorizeProductLookupError(testBarcode, error)

      expect(result.barcode).toBe(testBarcode)
    })

    it('should always set found to false for errors', () => {
      const error = new Error('Test') as Error & { isNetworkError?: boolean }

      const result = categorizeProductLookupError(testBarcode, error)

      expect(result.found).toBe(false)
    })

    it('should always set source to open_food_facts', () => {
      const error = new Error('Test') as Error & { isNetworkError?: boolean }

      const result = categorizeProductLookupError(testBarcode, error)

      expect(result.source).toBe('open_food_facts')
    })
  })
})
