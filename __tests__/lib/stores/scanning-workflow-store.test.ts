/**
 * Tests for scanning workflow store - Product not found behavior
 *
 * This test suite verifies that the scanning workflow store correctly:
 * - Does NOT auto-advance when product is not found
 * - DOES auto-advance when product is successfully found
 * - Sets "Unknown Product" when product lookup fails
 * - Maintains correct workflow state through the scanning process
 */

import { act, renderHook } from '@testing-library/react'
import {
  useScanningActions,
  useScanningStep,
  useScannedProduct,
} from '@/lib/stores/scanning-workflow-store'
import type { ProductLookupResult } from '@/lib/queries/open-food-facts'

describe('Scanning Workflow Store - Product Lookup Handling', () => {
  beforeEach(() => {
    // Reset the store before each test
    const { result } = renderHook(() => useScanningActions())
    act(() => {
      result.current.resetWorkflow()
    })
  })

  describe('Product Found - Auto-advance behavior', () => {
    it('should auto-advance to OCR step when product is found', () => {
      const { result: actionsResult } = renderHook(() => useScanningActions())
      const { result: stepResult } = renderHook(() => useScanningStep())
      const { result: productResult } = renderHook(() => useScannedProduct())

      // Scan a barcode
      act(() => {
        actionsResult.current.setBarcodeScanned('0813602026657')
      })

      // Verify we're on the product step
      expect(stepResult.current).toBe('product')

      // Simulate successful product lookup
      const successfulLookup: ProductLookupResult = {
        barcode: '0813602026657',
        found: true,
        product: {
          _id: '0813602026657',
          product_name: 'Test Product',
          brands: 'Test Brand',
          image_front_url: 'https://example.com/image.jpg',
        },
        source: 'open_food_facts',
      }

      act(() => {
        actionsResult.current.setProductLookupResult(successfulLookup)
      })

      // Should auto-advance to OCR step
      expect(stepResult.current).toBe('ocr')

      // Product name should be set from lookup
      expect(productResult.current?.productName).toBe('Test Product')
      expect(productResult.current?.brand).toBe('Test Brand')
    })

    it('should set product details from lookup result', () => {
      const { result: actionsResult } = renderHook(() => useScanningActions())
      const { result: productResult } = renderHook(() => useScannedProduct())

      act(() => {
        actionsResult.current.setBarcodeScanned('0813602026657')
      })

      const successfulLookup: ProductLookupResult = {
        barcode: '0813602026657',
        found: true,
        product: {
          _id: '0813602026657',
          product_name: 'Organic Milk',
          brands: 'Organic Valley',
          categories: 'Dairy, Milk',
          image_front_url: 'https://example.com/milk.jpg',
        },
        source: 'open_food_facts',
      }

      act(() => {
        actionsResult.current.setProductLookupResult(successfulLookup)
      })

      expect(productResult.current).toMatchObject({
        barcode: '0813602026657',
        productName: 'Organic Milk',
        brand: 'Organic Valley',
        category: 'Dairy',
        imageUrl: 'https://example.com/milk.jpg',
      })
    })
  })

  describe('Product Not Found - Stay on current step', () => {
    it('should NOT auto-advance when product is not found', () => {
      const { result: actionsResult } = renderHook(() => useScanningActions())
      const { result: stepResult } = renderHook(() => useScanningStep())

      // Scan a barcode
      act(() => {
        actionsResult.current.setBarcodeScanned('9999999999999')
      })

      // Verify we're on the product step
      expect(stepResult.current).toBe('product')

      // Simulate failed product lookup
      const failedLookup: ProductLookupResult = {
        barcode: '9999999999999',
        found: false,
        error: 'Product not found in Open Food Facts database',
        errorType: 'not_found',
        source: 'open_food_facts',
      }

      act(() => {
        actionsResult.current.setProductLookupResult(failedLookup)
      })

      // Should STAY on product step, NOT advance to OCR
      expect(stepResult.current).toBe('product')
    })

    it('should set Unknown Product when lookup fails', () => {
      const { result: actionsResult } = renderHook(() => useScanningActions())
      const { result: productResult } = renderHook(() => useScannedProduct())

      act(() => {
        actionsResult.current.setBarcodeScanned('9999999999999')
      })

      const failedLookup: ProductLookupResult = {
        barcode: '9999999999999',
        found: false,
        error: 'Product not found in database',
        errorType: 'not_found',
        source: 'open_food_facts',
      }

      act(() => {
        actionsResult.current.setProductLookupResult(failedLookup)
      })

      expect(productResult.current?.productName).toBe('Unknown Product')
      expect(productResult.current?.lookupResult).toEqual(failedLookup)
    })

    it('should NOT auto-advance on network errors', () => {
      const { result: actionsResult } = renderHook(() => useScanningActions())
      const { result: stepResult } = renderHook(() => useScanningStep())

      act(() => {
        actionsResult.current.setBarcodeScanned('0813602026657')
      })

      const networkErrorLookup: ProductLookupResult = {
        barcode: '0813602026657',
        found: false,
        error: 'Network error - please check your connection',
        errorType: 'network',
        source: 'open_food_facts',
      }

      act(() => {
        actionsResult.current.setProductLookupResult(networkErrorLookup)
      })

      // Should stay on product step
      expect(stepResult.current).toBe('product')
    })

    it('should NOT auto-advance on invalid barcode errors', () => {
      const { result: actionsResult } = renderHook(() => useScanningActions())
      const { result: stepResult } = renderHook(() => useScanningStep())

      act(() => {
        actionsResult.current.setBarcodeScanned('123')
      })

      const invalidBarcodeLookup: ProductLookupResult = {
        barcode: '123',
        found: false,
        error: 'Invalid barcode format',
        errorType: 'invalid_barcode',
        source: 'open_food_facts',
      }

      act(() => {
        actionsResult.current.setProductLookupResult(invalidBarcodeLookup)
      })

      // Should stay on product step
      expect(stepResult.current).toBe('product')
    })
  })

  describe('Manual product confirmation', () => {
    it('should allow manual product entry and advance when confirmed', () => {
      const { result: actionsResult } = renderHook(() => useScanningActions())
      const { result: stepResult } = renderHook(() => useScanningStep())
      const { result: productResult } = renderHook(() => useScannedProduct())

      // Scan barcode
      act(() => {
        actionsResult.current.setBarcodeScanned('0813602026657')
      })

      // Product not found
      const failedLookup: ProductLookupResult = {
        barcode: '0813602026657',
        found: false,
        error: 'Product not found',
        errorType: 'not_found',
        source: 'open_food_facts',
      }

      act(() => {
        actionsResult.current.setProductLookupResult(failedLookup)
      })

      // User manually enters product details
      act(() => {
        actionsResult.current.setManualProductEntry({
          productName: 'Manually Entered Product',
          brand: 'Manual Brand',
        })
      })

      expect(productResult.current?.productName).toBe('Manually Entered Product')
      expect(productResult.current?.brand).toBe('Manual Brand')
      expect(productResult.current?.isManualEntry).toBe(true)

      // User confirms product - should advance
      act(() => {
        actionsResult.current.confirmProduct()
      })

      expect(stepResult.current).toBe('ocr')
    })
  })

  describe('Workflow state persistence', () => {
    it('should maintain lookup result in scan history', () => {
      const { result: actionsResult } = renderHook(() => useScanningActions())

      act(() => {
        actionsResult.current.setBarcodeScanned('0813602026657')
      })

      const successfulLookup: ProductLookupResult = {
        barcode: '0813602026657',
        found: true,
        product: {
          _id: '0813602026657',
          product_name: 'Test Product',
        },
        source: 'open_food_facts',
      }

      act(() => {
        actionsResult.current.setProductLookupResult(successfulLookup)
      })

      // The lookup result should be stored with the scanned product
      const { result: productResult } = renderHook(() => useScannedProduct())
      expect(productResult.current?.lookupResult).toEqual(successfulLookup)
    })
  })

  describe('Edge cases', () => {
    it('should not crash when lookup result is set without scanned product', () => {
      const { result: actionsResult } = renderHook(() => useScanningActions())

      const lookup: ProductLookupResult = {
        barcode: '123',
        found: false,
        error: 'Test',
        source: 'open_food_facts',
      }

      expect(() => {
        act(() => {
          actionsResult.current.setProductLookupResult(lookup)
        })
      }).not.toThrow()
    })

    it('should not auto-advance when already on barcode step', () => {
      const { result: actionsResult } = renderHook(() => useScanningActions())
      const { result: stepResult } = renderHook(() => useScanningStep())

      // Start on barcode step
      act(() => {
        actionsResult.current.setCurrentStep('barcode')
      })

      act(() => {
        actionsResult.current.setBarcodeScanned('0813602026657')
      })

      // Go back to barcode step
      act(() => {
        actionsResult.current.setCurrentStep('barcode')
      })

      const successfulLookup: ProductLookupResult = {
        barcode: '0813602026657',
        found: true,
        product: {
          _id: '0813602026657',
          product_name: 'Test',
        },
        source: 'open_food_facts',
      }

      act(() => {
        actionsResult.current.setProductLookupResult(successfulLookup)
      })

      // Should stay on barcode step (user went back deliberately)
      expect(stepResult.current).toBe('barcode')
    })
  })
})
