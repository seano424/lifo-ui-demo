/**
 * OCR API Configuration
 *
 * Centralized configuration for switching between mock and real OCR API.
 *
 * Usage:
 * 1. Set NEXT_PUBLIC_USE_MOCK_OCR=true in .env.local for development
 * 2. Set NEXT_PUBLIC_USE_MOCK_OCR=false when backend API is ready
 */

export const OCR_CONFIG = {
  /** OCR API endpoint (automatically switches based on environment) */
  endpoint:
    process.env.NEXT_PUBLIC_USE_MOCK_OCR === 'true'
      ? '/api/delivery-note-ocr/mock'
      : '/api/delivery-note-ocr',

  /** Whether currently using mock API */
  isMock: process.env.NEXT_PUBLIC_USE_MOCK_OCR === 'true',

  /** Maximum file size for image uploads (5MB) */
  maxFileSize: 5 * 1024 * 1024,

  /** Supported MIME types for delivery note images */
  supportedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'] as const,

  /** Supported file extensions */
  supportedExtensions: ['.jpg', '.jpeg', '.png', '.pdf'] as const,
} as const

/**
 * Validate if file is acceptable for OCR processing
 */
export function isValidOcrFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > OCR_CONFIG.maxFileSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${OCR_CONFIG.maxFileSize / 1024 / 1024}MB`,
    }
  }

  // Check MIME type
  type SupportedMimeType = (typeof OCR_CONFIG.supportedTypes)[number]
  if (!OCR_CONFIG.supportedTypes.includes(file.type as SupportedMimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Supported types: ${OCR_CONFIG.supportedExtensions.join(', ')}`,
    }
  }

  // Check file extension
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
  type SupportedExtension = (typeof OCR_CONFIG.supportedExtensions)[number]
  if (!extension || !OCR_CONFIG.supportedExtensions.includes(extension as SupportedExtension)) {
    return {
      valid: false,
      error: `Invalid file extension. Supported: ${OCR_CONFIG.supportedExtensions.join(', ')}`,
    }
  }

  return { valid: true }
}
