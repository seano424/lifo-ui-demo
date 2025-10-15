/**
 * Tests for Product Lookup Error UI Display
 *
 * This test suite verifies that the error UI display helper correctly:
 * - Shows appropriate error messages for different error types
 * - Shows/hides retry and manual entry buttons based on error type
 * - Returns null when product is found (no error)
 * - Handles all error scenarios gracefully
 */

import type { ProductLookupResult } from '@/lib/queries/open-food-facts'

// Mock all the hooks and dependencies
jest.mock('@/hooks/use-ocr-processing', () => ({
  useOCRWithFallback: () => ({
    processExpiryDate: jest.fn(),
    isLoading: false,
  }),
}))

jest.mock('@/hooks/use-product-lookup', () => ({
  useProductLookup: (_barcode: string | null, _enabled: boolean) => ({
    data: null,
    isLoading: false,
    error: null,
  }),
}))

jest.mock('@/lib/stores/scanning-workflow-store', () => ({
  useScanningStep: () => 'barcode',
  useScannedProduct: () => null,
  useExpiryInfo: () => null,
  useCanGoBack: () => false,
  usePreviousStepName: () => null,
  useScanningActions: () => ({
    setStoreId: jest.fn(),
    setBarcodeScanned: jest.fn(),
    setProductLookupResult: jest.fn(),
    setCurrentStep: jest.fn(),
    resetWorkflow: jest.fn(),
    setError: jest.fn(),
    setExpiryDateProcessing: jest.fn(),
    setExpiryDateResult: jest.fn(),
    setManualExpiryDate: jest.fn(),
    setBatchData: jest.fn(),
    completeWorkflow: jest.fn(),
    goBackStep: jest.fn(),
    confirmProduct: jest.fn(),
    setManualProductEntry: jest.fn(),
  }),
}))

jest.mock('@/lib/stores/store-context', () => ({
  useStoreState: () => ({
    activeStore: { store_id: 'test-store-123' },
  }),
}))

jest.mock('@/lib/api/ocr-client', () => ({
  captureImageFromVideo: jest.fn(),
}))

// Helper to extract error info from lookup result
function getProductLookupErrorMessage(
  lookupResult: ProductLookupResult | undefined,
  lookupError: Error | null,
): {
  title: string
  message: string
  showRetry: boolean
  showManualEntry: boolean
} | null {
  // No error if product was found
  if (lookupResult?.found) return null

  // Handle lookup errors from the hook
  if (lookupError) {
    return {
      title: 'Lookup Error',
      message: 'Unable to search for this product. Please try again.',
      showRetry: true,
      showManualEntry: true,
    }
  }

  // Handle specific error types from the result
  if (lookupResult && !lookupResult.found) {
    switch (lookupResult.errorType) {
      case 'network':
        return {
          title: 'Network Error',
          message:
            'Unable to connect to product database. Please check your internet connection and try again.',
          showRetry: true,
          showManualEntry: true,
        }
      case 'not_found':
        return {
          title: 'Product Not Found',
          message: `No product information found for barcode ${lookupResult.barcode}. You can proceed by entering product details manually.`,
          showRetry: false,
          showManualEntry: true,
        }
      case 'invalid_barcode':
        return {
          title: 'Invalid Barcode',
          message: 'The scanned barcode appears to be invalid. Please try scanning again.',
          showRetry: true,
          showManualEntry: false,
        }
      default:
        return {
          title: 'Lookup Failed',
          message: lookupResult.error || 'An error occurred while looking up the product.',
          showRetry: true,
          showManualEntry: true,
        }
    }
  }

  return null
}

describe('Product Lookup Error UI Display', () => {
  describe('getProductLookupErrorMessage', () => {
    describe('Network Errors', () => {
      it('should show network error with retry and manual entry options', () => {
        const lookupResult: ProductLookupResult = {
          barcode: '0813602026657',
          found: false,
          error: 'Network error - please check your connection',
          errorType: 'network',
          source: 'open_food_facts',
        }

        const errorInfo = getProductLookupErrorMessage(lookupResult, null)

        expect(errorInfo).toEqual({
          title: 'Network Error',
          message:
            'Unable to connect to product database. Please check your internet connection and try again.',
          showRetry: true,
          showManualEntry: true,
        })
      })
    })

    describe('Product Not Found Errors', () => {
      it('should show not found error with manual entry option only', () => {
        const lookupResult: ProductLookupResult = {
          barcode: '9999999999999',
          found: false,
          error: 'Product not found in database',
          errorType: 'not_found',
          source: 'open_food_facts',
        }

        const errorInfo = getProductLookupErrorMessage(lookupResult, null)

        expect(errorInfo).toEqual({
          title: 'Product Not Found',
          message:
            'No product information found for barcode 9999999999999. You can proceed by entering product details manually.',
          showRetry: false,
          showManualEntry: true,
        })
      })

      it('should include barcode in error message', () => {
        const lookupResult: ProductLookupResult = {
          barcode: '1234567890123',
          found: false,
          error: 'Product not found',
          errorType: 'not_found',
          source: 'open_food_facts',
        }

        const errorInfo = getProductLookupErrorMessage(lookupResult, null)

        expect(errorInfo?.message).toContain('1234567890123')
      })
    })

    describe('Invalid Barcode Errors', () => {
      it('should show invalid barcode error with retry only', () => {
        const lookupResult: ProductLookupResult = {
          barcode: '123',
          found: false,
          error: 'Invalid barcode format',
          errorType: 'invalid_barcode',
          source: 'open_food_facts',
        }

        const errorInfo = getProductLookupErrorMessage(lookupResult, null)

        expect(errorInfo).toEqual({
          title: 'Invalid Barcode',
          message: 'The scanned barcode appears to be invalid. Please try scanning again.',
          showRetry: true,
          showManualEntry: false,
        })
      })
    })

    describe('Generic API Errors', () => {
      it('should show generic error with retry and manual entry', () => {
        const lookupResult: ProductLookupResult = {
          barcode: '0813602026657',
          found: false,
          error: 'API request failed',
          errorType: 'api_error',
          source: 'open_food_facts',
        }

        const errorInfo = getProductLookupErrorMessage(lookupResult, null)

        expect(errorInfo).toEqual({
          title: 'Lookup Failed',
          message: 'API request failed',
          showRetry: true,
          showManualEntry: true,
        })
      })

      it('should use default message when error message is missing', () => {
        const lookupResult: ProductLookupResult = {
          barcode: '0813602026657',
          found: false,
          source: 'open_food_facts',
        }

        const errorInfo = getProductLookupErrorMessage(lookupResult, null)

        expect(errorInfo?.message).toBe('An error occurred while looking up the product.')
      })
    })

    describe('Hook Errors', () => {
      it('should handle hook-level errors', () => {
        const hookError = new Error('Query failed')

        const errorInfo = getProductLookupErrorMessage(undefined, hookError)

        expect(errorInfo).toEqual({
          title: 'Lookup Error',
          message: 'Unable to search for this product. Please try again.',
          showRetry: true,
          showManualEntry: true,
        })
      })
    })

    describe('Success Cases', () => {
      it('should return null when product is found', () => {
        const lookupResult: ProductLookupResult = {
          barcode: '0813602026657',
          found: true,
          product: {
            _id: '0813602026657',
            product_name: 'Test Product',
          },
          source: 'open_food_facts',
        }

        const errorInfo = getProductLookupErrorMessage(lookupResult, null)

        expect(errorInfo).toBeNull()
      })

      it('should return null when no lookup result and no error', () => {
        const errorInfo = getProductLookupErrorMessage(undefined, null)

        expect(errorInfo).toBeNull()
      })
    })

    describe('Button Visibility Logic', () => {
      it('should show both retry and manual entry for network errors', () => {
        const result: ProductLookupResult = {
          barcode: '123',
          found: false,
          errorType: 'network',
          source: 'open_food_facts',
        }

        const errorInfo = getProductLookupErrorMessage(result, null)

        expect(errorInfo?.showRetry).toBe(true)
        expect(errorInfo?.showManualEntry).toBe(true)
      })

      it('should show only manual entry for not_found errors', () => {
        const result: ProductLookupResult = {
          barcode: '123',
          found: false,
          errorType: 'not_found',
          source: 'open_food_facts',
        }

        const errorInfo = getProductLookupErrorMessage(result, null)

        expect(errorInfo?.showRetry).toBe(false)
        expect(errorInfo?.showManualEntry).toBe(true)
      })

      it('should show only retry for invalid_barcode errors', () => {
        const result: ProductLookupResult = {
          barcode: '123',
          found: false,
          errorType: 'invalid_barcode',
          source: 'open_food_facts',
        }

        const errorInfo = getProductLookupErrorMessage(result, null)

        expect(errorInfo?.showRetry).toBe(true)
        expect(errorInfo?.showManualEntry).toBe(false)
      })
    })
  })
})
