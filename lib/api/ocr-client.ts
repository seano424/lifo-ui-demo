/**
 * OCR API client for Google Vision integration with FastAPI backend
 * Connects to Slimane's OCR endpoints for expiration date extraction
 */

import type { ExpiryDateInfo } from '@/lib/stores/scanning-workflow-store'
import { logger } from '@/lib/utils/logger'

export interface OCRUploadResponse {
  success: boolean
  scan_type: string
  expiry_date?: string
  confidence_score: number // Actual OCR confidence from Vision API
  confidence_threshold: number // User's input threshold parameter
  raw_ocr_text: string // Raw OCR text extracted from image
  processing_type: string
}

export interface OCRFullAnalysisResponse {
  success: boolean
  scan_type: string
  barcode?: string
  suggested_name?: string
  expiry_date?: string
  manufacture_date?: string
  // Batch number detection (NEW)
  batch_number?: string
  batch_confidence?: number
  batch_metadata?: {
    format_detected?: string
    proximity_to_expiry_px?: number
    bounding_box?: Record<string, number>
    total_candidates?: number
  }
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
  date_extraction_metadata: Record<string, unknown>
}

/**
 * Custom Error class for OCR operations
 * Extends Error to be properly serializable by React error boundaries
 */
export class OCRError extends Error {
  public readonly type: 'network' | 'api' | 'timeout' | 'validation' | 'rate_limit'
  public readonly details?: unknown

  constructor(
    message: string,
    type: 'network' | 'api' | 'timeout' | 'validation' | 'rate_limit',
    details?: unknown,
  ) {
    super(message)
    this.name = 'OCRError'
    this.type = type
    this.details = details

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OCRError)
    }
  }
}

/**
 * Convert canvas to blob for API upload
 */
export async function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to convert canvas to blob'))
        }
      },
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Extract expiry date from image using FastAPI OCR endpoint
 */
export async function extractExpiryDate(
  imageBlob: Blob,
  storeId: string,
  options?: {
    confidenceThreshold?: number
    maxProcessingTimeMs?: number
  },
): Promise<ExpiryDateInfo> {
  const startTime = Date.now()

  logger.log('OCRClient', 'extractExpiryDate called', {
    imageBlobSize: imageBlob.size,
    imageBlobType: imageBlob.type,
    storeId,
    options,
  })

  try {
    // Prepare form data
    const formData = new FormData()
    formData.append('image', imageBlob, 'expiry-scan.jpg')

    if (options?.confidenceThreshold) {
      formData.append('confidence_threshold', options.confidenceThreshold.toString())
    }

    if (options?.maxProcessingTimeMs) {
      formData.append('max_processing_time_ms', options.maxProcessingTimeMs.toString())
    }

    logger.log('OCRClient', 'FormData prepared', {
      hasImage: formData.has('image'),
      confidenceThreshold: options?.confidenceThreshold,
      maxProcessingTimeMs: options?.maxProcessingTimeMs,
    })

    // Make API call via Next.js proxy route (handles auth and CSP)
    const endpoint = `/api/ocr/scan/ocr-expiry/${storeId}`
    logger.log('OCRClient', 'Making API call to Next.js proxy', {
      endpoint,
      method: 'POST',
    })

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type - let browser set it with boundary for FormData
    })

    logger.log('OCRClient', 'API response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('OCRClient', 'API returned error response', {
        status: response.status,
        statusText: response.statusText,
        errorText,
      })

      // Check for rate limit error (429)
      if (response.status === 429) {
        throw new OCRError(`Rate limit exceeded: ${errorText}`, 'rate_limit', {
          status: response.status,
          errorText,
        })
      }

      throw new Error(`API error ${response.status}: ${errorText}`)
    }

    const data: OCRUploadResponse = await response.json()
    const processingTime = Date.now() - startTime

    logger.log('OCRClient', 'OCR API response parsed', {
      success: data.success,
      scanType: data.scan_type,
      hasExpiryDate: !!data.expiry_date,
      expiryDate: data.expiry_date,
      confidenceScore: data.confidence_score,
      confidenceThreshold: data.confidence_threshold,
      processingType: data.processing_type,
      rawOcrText: data.raw_ocr_text,
      processingTime,
    })

    logger.log('OCRClient', 'Raw OCR text extracted from image:', {
      text: data.raw_ocr_text,
      textLength: data.raw_ocr_text?.length || 0,
    })

    // Transform API response to ExpiryDateInfo
    const result = {
      extractedDate: data.expiry_date || undefined,
      confidence: data.confidence_score, // Now using actual OCR confidence!
      isManual: false,
      rawOcrText: data.raw_ocr_text, // Now using actual OCR text from backend
      processingTime,
    }

    logger.log('OCRClient', 'Returning ExpiryDateInfo', result)

    return result
  } catch (error) {
    // If error is already an OCRError, log and re-throw it
    if (error instanceof OCRError) {
      logger.error('OCRClient', 'OCR extraction failed', {
        error: error.message,
        errorType: error.type,
        details: error.details,
      })
      throw error
    }

    // Log standard errors
    logger.error('OCRClient', 'OCR extraction failed', {
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Create OCR error with type classification
    const errorMessage = error instanceof Error ? error.message : 'Unknown OCR error'
    const errorDetails =
      error instanceof Error
        ? { message: error.message, name: error.name }
        : { error: String(error) }

    // Classify error type
    let errorType: OCRError['type'] = 'api'
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorType = 'network'
      logger.error('OCRClient', 'Classified as network error')
    } else if (error instanceof Error && error.message.includes('timeout')) {
      errorType = 'timeout'
      logger.error('OCRClient', 'Classified as timeout error')
    } else if (error instanceof Error && error.message.includes('validation')) {
      errorType = 'validation'
      logger.error('OCRClient', 'Classified as validation error')
    }

    throw new OCRError(errorMessage, errorType, errorDetails)
  }
}

/**
 * Perform full OCR analysis with barcode detection and text extraction
 */
export async function performFullOCRAnalysis(
  imageBlob: Blob,
  storeId: string,
  options?: {
    confidenceThreshold?: number
    maxProcessingTimeMs?: number
  },
): Promise<{
  expiryDateInfo: ExpiryDateInfo
  additionalData: {
    barcode?: string
    suggestedName?: string
    manufactureDate?: string
    textBlocks: string[]
    confidenceScores: {
      overall: number
      barcode: number
      expiry: number
    }
  }
}> {
  const startTime = Date.now()

  try {
    // Prepare form data
    const formData = new FormData()
    formData.append('image', imageBlob, 'full-ocr-scan.jpg')

    if (options?.confidenceThreshold) {
      formData.append('confidence_threshold', options.confidenceThreshold.toString())
    }

    if (options?.maxProcessingTimeMs) {
      formData.append('max_processing_time_ms', options.maxProcessingTimeMs.toString())
    }

    // Make API call via Next.js proxy route (handles auth and CSP)
    const response = await fetch(`/api/ocr/scan/full-ocr/${storeId}`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error ${response.status}: ${errorText}`)
    }

    const data: OCRFullAnalysisResponse = await response.json()
    const processingTime = Date.now() - startTime

    // Transform API response
    const expiryDateInfo: ExpiryDateInfo = {
      extractedDate: data.expiry_date || undefined,
      confidence: data.confidence_scores.expiry || 0.0,
      isManual: false,
      rawOcrText: data.raw_text_blocks.join(' '),
      processingTime,
      // Batch number fields (NEW)
      batchNumber: data.batch_number,
      batchConfidence: data.batch_confidence,
      batchFormat: data.batch_metadata?.format_detected,
    }

    const additionalData = {
      barcode: data.barcode,
      suggestedName: data.suggested_name,
      manufactureDate: data.manufacture_date,
      textBlocks: data.raw_text_blocks,
      confidenceScores: data.confidence_scores,
    }

    return {
      expiryDateInfo,
      additionalData,
    }
  } catch (error) {
    console.error('Full OCR analysis failed:', error)

    // Create OCR error with type classification
    const errorMessage = error instanceof Error ? error.message : 'Unknown OCR error'
    const errorDetails =
      error instanceof Error
        ? { message: error.message, name: error.name }
        : { error: String(error) }

    // Classify error type
    let errorType: OCRError['type'] = 'api'
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorType = 'network'
    } else if (error instanceof Error && error.message.includes('timeout')) {
      errorType = 'timeout'
    } else if (error instanceof Error && error.message.includes('validation')) {
      errorType = 'validation'
    }

    throw new OCRError(errorMessage, errorType, errorDetails)
  }
}

/**
 * Extract text only from image (lightweight operation)
 */
export async function extractTextOnly(
  imageBlob: Blob,
  storeId: string,
  confidenceThreshold = 0.6,
): Promise<{
  textBlocks: string[]
  suggestedName?: string
  processingTime: number
}> {
  const startTime = Date.now()

  try {
    const formData = new FormData()
    formData.append('image', imageBlob, 'text-extraction.jpg')
    formData.append('confidence_threshold', confidenceThreshold.toString())

    // Make API call via Next.js proxy route (handles auth and CSP)
    const response = await fetch(`/api/ocr/scan/text-extraction/${storeId}`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const processingTime = Date.now() - startTime

    return {
      textBlocks: data.text_blocks || [],
      suggestedName: data.suggested_name,
      processingTime,
    }
  } catch (error) {
    console.error('Text extraction failed:', error)
    throw error
  }
}

/**
 * Capture image from video element and convert to blob
 */
export async function captureImageFromVideo(
  videoElement: HTMLVideoElement,
  quality = 0.8,
): Promise<Blob> {
  logger.log('OCRClient', 'captureImageFromVideo called', {
    videoWidth: videoElement.videoWidth,
    videoHeight: videoElement.videoHeight,
    width: videoElement.width,
    height: videoElement.height,
    quality,
  })

  // Create canvas with video dimensions
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    logger.error('OCRClient', 'Failed to get canvas context')
    throw new Error('Failed to get canvas context')
  }

  canvas.width = videoElement.videoWidth || videoElement.width
  canvas.height = videoElement.videoHeight || videoElement.height

  logger.log('OCRClient', 'Drawing video frame to canvas', {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
  })

  // Draw video frame to canvas
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

  // Convert canvas to blob
  logger.log('OCRClient', 'Converting canvas to blob...')
  const blob = await canvasToBlob(canvas, quality)
  logger.log('OCRClient', 'Canvas converted to blob', {
    blobSize: blob.size,
    blobType: blob.type,
  })

  return blob
}

/**
//  * Utility function to check if FastAPI backend is available
//  */
// export async function checkBackendHealth(): Promise<boolean> {
//   try {
//     // Validate API URL is configured
//     const apiUrl = validateFastApiUrl()

//     const response = await fetch(`${apiUrl}/health`, {
//       method: 'GET',
//       signal: AbortSignal.timeout(10000),
//     })

//     if (response.ok) {
//       const data = await response.json()
//       return data.status === 'healthy'
//     }

//     return false
//   } catch (error) {
//     console.warn('FastAPI backend not available:', error)
//     return false
//   }
// }
