/**
 * Tests for OCR type guards
 * Ensures runtime type checking works correctly
 */

import {
  isOCRError,
  isRateLimitError,
  isNetworkError,
  isTimeoutError,
  getErrorMessage,
} from '@/lib/utils/ocr-type-guards'
import type { OCRError } from '@/lib/api/ocr-client'

describe('ocr-type-guards', () => {
  describe('isOCRError', () => {
    it('should return true for valid OCRError objects', () => {
      const validErrors: OCRError[] = [
        { message: 'Network error', type: 'network' },
        { message: 'API error', type: 'api' },
        { message: 'Timeout', type: 'timeout' },
        { message: 'Validation failed', type: 'validation' },
        { message: 'Rate limited', type: 'rate_limit' },
      ]

      validErrors.forEach(error => {
        expect(isOCRError(error)).toBe(true)
      })
    })

    it('should return true for OCRError with details', () => {
      const errorWithDetails: OCRError = {
        message: 'API error',
        type: 'api',
        details: { status: 500, body: 'Internal Server Error' },
      }

      expect(isOCRError(errorWithDetails)).toBe(true)
    })

    it('should return false for regular Error objects', () => {
      const regularError = new Error('Something went wrong')
      expect(isOCRError(regularError)).toBe(false)
    })

    it('should return false for objects missing required properties', () => {
      expect(isOCRError({ message: 'error' })).toBe(false)
      expect(isOCRError({ type: 'api' })).toBe(false)
      expect(isOCRError({})).toBe(false)
    })

    it('should return false for invalid type values', () => {
      expect(isOCRError({ message: 'error', type: 'invalid_type' })).toBe(false)
      expect(isOCRError({ message: 'error', type: 123 })).toBe(false)
      expect(isOCRError({ message: 'error', type: null })).toBe(false)
    })

    it('should return false for non-object types', () => {
      expect(isOCRError(null)).toBe(false)
      expect(isOCRError(undefined)).toBe(false)
      expect(isOCRError('error string')).toBe(false)
      expect(isOCRError(123)).toBe(false)
      expect(isOCRError(true)).toBe(false)
    })

    it('should return false for arrays', () => {
      expect(isOCRError([])).toBe(false)
      expect(isOCRError(['error'])).toBe(false)
    })
  })

  describe('isRateLimitError', () => {
    it('should return true for rate limit OCRErrors', () => {
      const rateLimitError: OCRError = {
        message: 'Rate limit exceeded',
        type: 'rate_limit',
      }

      expect(isRateLimitError(rateLimitError)).toBe(true)
    })

    it('should return false for other OCRError types', () => {
      const networkError: OCRError = { message: 'Network error', type: 'network' }
      const apiError: OCRError = { message: 'API error', type: 'api' }

      expect(isRateLimitError(networkError)).toBe(false)
      expect(isRateLimitError(apiError)).toBe(false)
    })

    it('should return false for non-OCRErrors', () => {
      expect(isRateLimitError(new Error('Regular error'))).toBe(false)
      expect(isRateLimitError(null)).toBe(false)
      expect(isRateLimitError({ message: 'error' })).toBe(false)
    })
  })

  describe('isNetworkError', () => {
    it('should return true for network OCRErrors', () => {
      const networkError: OCRError = {
        message: 'Failed to fetch',
        type: 'network',
      }

      expect(isNetworkError(networkError)).toBe(true)
    })

    it('should return false for other OCRError types', () => {
      const rateLimitError: OCRError = { message: 'Rate limited', type: 'rate_limit' }
      const timeoutError: OCRError = { message: 'Timeout', type: 'timeout' }

      expect(isNetworkError(rateLimitError)).toBe(false)
      expect(isNetworkError(timeoutError)).toBe(false)
    })

    it('should return false for non-OCRErrors', () => {
      expect(isNetworkError(new Error('Network error'))).toBe(false)
      expect(isNetworkError(null)).toBe(false)
    })
  })

  describe('isTimeoutError', () => {
    it('should return true for timeout OCRErrors', () => {
      const timeoutError: OCRError = {
        message: 'Request timeout',
        type: 'timeout',
      }

      expect(isTimeoutError(timeoutError)).toBe(true)
    })

    it('should return false for other OCRError types', () => {
      const networkError: OCRError = { message: 'Network error', type: 'network' }
      const validationError: OCRError = { message: 'Validation failed', type: 'validation' }

      expect(isTimeoutError(networkError)).toBe(false)
      expect(isTimeoutError(validationError)).toBe(false)
    })

    it('should return false for non-OCRErrors', () => {
      expect(isTimeoutError(new Error('Timeout'))).toBe(false)
      expect(isTimeoutError(null)).toBe(false)
    })
  })

  describe('getErrorMessage', () => {
    it('should extract message from OCRError', () => {
      const ocrError: OCRError = {
        message: 'API request failed',
        type: 'api',
      }

      expect(getErrorMessage(ocrError)).toBe('API request failed')
    })

    it('should extract message from regular Error', () => {
      const regularError = new Error('Something went wrong')
      expect(getErrorMessage(regularError)).toBe('Something went wrong')
    })

    it('should convert non-Error values to string', () => {
      expect(getErrorMessage('string error')).toBe('string error')
      expect(getErrorMessage(123)).toBe('123')
      expect(getErrorMessage(true)).toBe('true')
      expect(getErrorMessage(null)).toBe('null')
      expect(getErrorMessage(undefined)).toBe('undefined')
    })

    it('should handle objects without message property', () => {
      const obj = { code: 500, status: 'error' }
      expect(getErrorMessage(obj)).toBe('[object Object]')
    })

    it('should handle arrays', () => {
      expect(getErrorMessage(['error1', 'error2'])).toBe('error1,error2')
    })
  })

  describe('Type Narrowing', () => {
    it('should narrow unknown to OCRError', () => {
      function handleError(error: unknown) {
        if (isOCRError(error)) {
          // TypeScript should know error is OCRError here
          return error.type
        }
        return 'unknown'
      }

      const ocrError: OCRError = { message: 'test', type: 'api' }
      expect(handleError(ocrError)).toBe('api')
      expect(handleError(new Error('test'))).toBe('unknown')
    })

    it('should narrow to rate_limit type', () => {
      function handleRateLimit(error: unknown): boolean {
        if (isRateLimitError(error)) {
          // TypeScript knows error.type === 'rate_limit'
          return error.type === 'rate_limit'
        }
        return false
      }

      const rateLimitError: OCRError = { message: 'test', type: 'rate_limit' }
      const networkError: OCRError = { message: 'test', type: 'network' }

      expect(handleRateLimit(rateLimitError)).toBe(true)
      expect(handleRateLimit(networkError)).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle frozen objects', () => {
      const frozenError = Object.freeze({
        message: 'frozen error',
        type: 'api' as const,
      })

      expect(isOCRError(frozenError)).toBe(true)
    })

    it('should handle objects with extra properties', () => {
      const extendedError = {
        message: 'extended error',
        type: 'network' as const,
        details: { foo: 'bar' },
        extraProp: 'extra',
        anotherProp: 123,
      }

      expect(isOCRError(extendedError)).toBe(true)
    })

    it('should handle objects with prototype chain', () => {
      class CustomError {
        message = 'custom error'
        type = 'api' as const
      }

      const customError = new CustomError()
      expect(isOCRError(customError)).toBe(true)
    })

    it('should handle objects with null prototype', () => {
      const nullProtoObj = Object.create(null)
      nullProtoObj.message = 'null proto error'
      nullProtoObj.type = 'validation'

      expect(isOCRError(nullProtoObj)).toBe(true)
    })
  })
})
