/**
 * TypeScript types for OCR API responses and processing
 * Based on Slimane's FastAPI OCR implementation
 */

export interface OCRExpiryResponse {
  success: boolean
  scan_type: 'expiry_date_extraction'
  expiry_date?: string // ISO date string
  confidence_threshold: number
  processing_type: 'google_vision_ocr'
}

export interface OCRFullAnalysisResponse {
  success: boolean
  scan_type: 'full_ocr_analysis'
  barcode?: string
  suggested_name?: string
  expiry_date?: string // ISO date string
  manufacture_date?: string // ISO date string
  raw_text_blocks: string[]
  confidence_scores: {
    overall: number
    barcode: number
    expiry: number
  }
  processing_info: {
    processing_time_ms: number
    data_sources: string[]
    requires_user_confirmation: boolean
    image_dimensions?: [number, number]
  }
  vision_details: {
    detected_barcodes: number
    detected_text_blocks: number
    expiry_candidates: number
  }
  date_extraction_metadata: {
    total_dates_detected: number
    expiry_candidates: number
    manufacture_candidates: number
    unknown_candidates: number
    extraction_strategy: 'dual_context_based' | 'temporal_inference'
    expiry_metadata: DateMetadata
    manufacture_metadata: DateMetadata
  }
}

export interface OCRTextExtractionResponse {
  success: boolean
  scan_type: 'text_extraction'
  text_blocks: string[]
  suggested_name?: string
  confidence_threshold: number
  processing_info: {
    processing_time_ms: number
    total_text_blocks: number
    high_confidence_blocks: number
  }
}

export interface DateMetadata {
  context: string
  confidence: number
  language?: string
  raw_context?: string
  source: string
}

export interface OCRErrorResponse {
  detail: string
  status_code: number
}

export type OCRProcessingType = 'expiry_extraction' | 'full_analysis' | 'text_extraction'

export interface OCRRequestOptions {
  confidenceThreshold?: number
  maxProcessingTimeMs?: number
  enableBarcodeDetection?: boolean
  enableExpiryExtraction?: boolean
  enableTextExtraction?: boolean
}

// Frontend processing state
export interface OCRProcessingState {
  isProcessing: boolean
  processType?: OCRProcessingType
  progress?: number
  error?: string
  retryCount?: number
}

// Processed OCR result for UI consumption
export interface ProcessedOCRResult {
  // Core extracted data
  expiryDate?: string
  manufactureDate?: string
  barcode?: string
  productName?: string

  // Quality indicators
  confidence: {
    overall: number
    expiry: number
    barcode: number
    text: number
  }

  // Processing metadata
  processingTime: number
  requiresConfirmation: boolean

  // Raw data for debugging/advanced features
  rawTextBlocks: string[]
  detectionCounts: {
    barcodes: number
    textBlocks: number
    expiryDates: number
  }

  // Language and context information
  detectedLanguage?: string
  extractionStrategy?: string
}

// Error handling types
export type OCRErrorType = 'network' | 'api' | 'timeout' | 'validation' | 'processing'

export interface OCRError {
  message: string
  type: OCRErrorType
  details?: Record<string, unknown>
  retry?: boolean
}

// Image processing types
export interface ImageCaptureOptions {
  quality?: number // 0.0 to 1.0
  format?: 'jpeg' | 'png' | 'webp'
  maxWidth?: number
  maxHeight?: number
}

export interface CapturedImage {
  blob: Blob
  dataUrl?: string
  dimensions: {
    width: number
    height: number
  }
  size: number // bytes
  timestamp: number
}

// Cache types for offline/retry scenarios
export interface OCRCacheEntry {
  imageHash: string
  storeId: string
  result: ProcessedOCRResult
  timestamp: number
  expiresAt: number
}

// Hook return types
export interface OCRHookResult {
  data?: ProcessedOCRResult
  isLoading: boolean
  error?: OCRError
  retry: () => void
  reset: () => void
}

export interface OCRWithFallbackResult {
  success: boolean
  data?: ProcessedOCRResult
  error?: OCRError
  fallbackToManual: boolean
  retryAvailable: boolean
}

// Configuration types
export interface OCRServiceConfig {
  baseUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  cacheEnabled: boolean
  cacheDuration: number
}

// Analytics types for tracking OCR usage
export interface OCRAnalytics {
  totalRequests: number
  successRate: number
  averageProcessingTime: number
  errorsByType: Record<OCRErrorType, number>
  confidenceDistribution: {
    high: number // >0.8
    medium: number // 0.5-0.8
    low: number // <0.5
  }
  languageDetection: Record<string, number>
}

// Export utility type guards
export function isOCRExpiryResponse(response: unknown): response is OCRExpiryResponse {
  return (
    response !== null &&
    typeof response === 'object' &&
    (response as Record<string, unknown>).scan_type === 'expiry_date_extraction'
  )
}

export function isOCRFullAnalysisResponse(response: unknown): response is OCRFullAnalysisResponse {
  return (
    response !== null &&
    typeof response === 'object' &&
    (response as Record<string, unknown>).scan_type === 'full_ocr_analysis'
  )
}

export function isOCRTextExtractionResponse(
  response: unknown,
): response is OCRTextExtractionResponse {
  return (
    response !== null &&
    typeof response === 'object' &&
    (response as Record<string, unknown>).scan_type === 'text_extraction'
  )
}

export function isOCRError(error: unknown): error is OCRError {
  return (
    error !== null &&
    typeof error === 'object' &&
    typeof (error as Record<string, unknown>).message === 'string' &&
    typeof (error as Record<string, unknown>).type === 'string'
  )
}
