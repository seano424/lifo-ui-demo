/**
 * Type guards for OCR-related types
 * Provides runtime type checking for better type safety
 */

import type { OCRError } from '@/lib/api/ocr-client'

/**
 * Type guard to check if an error is an OCRError
 * Safely narrows unknown error types to OCRError
 */
export function isOCRError(error: unknown): error is OCRError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as OCRError).message === 'string' &&
    'type' in error &&
    typeof (error as OCRError).type === 'string' &&
    ['network', 'api', 'timeout', 'validation', 'rate_limit'].includes((error as OCRError).type)
  )
}

/**
 * Type guard to check if an error is a rate limit error
 * Convenience function for common rate limit checks
 */
export function isRateLimitError(error: unknown): error is OCRError {
  return isOCRError(error) && error.type === 'rate_limit'
}

/**
 * Type guard to check if an error is a network error
 * Convenience function for network error handling
 */
export function isNetworkError(error: unknown): error is OCRError {
  return isOCRError(error) && error.type === 'network'
}

/**
 * Type guard to check if an error is a timeout error
 * Convenience function for timeout error handling
 */
export function isTimeoutError(error: unknown): error is OCRError {
  return isOCRError(error) && error.type === 'timeout'
}

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isOCRError(error)) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
