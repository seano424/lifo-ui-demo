/**
 * OCR API client for Google Vision integration with FastAPI backend
 * Connects to Slimane's OCR endpoints for expiration date extraction
 */

import { ExpiryDateInfo } from '@/lib/stores/scanning-workflow-store'
import { createClient } from '@/lib/supabase/client'

// Environment variables
const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8001'

/**
 * Get authentication headers for FastAPI requests
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session?.access_token) {
    throw new Error('Not authenticated - please log in')
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  }
}

export interface OCRUploadResponse {
  success: boolean
  scan_type: string
  expiry_date?: string
  confidence_threshold: number
  processing_type: string
}

export interface OCRFullAnalysisResponse {
  success: boolean
  scan_type: string
  barcode?: string
  suggested_name?: string
  expiry_date?: string
  manufacture_date?: string
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

export interface OCRError {
  message: string
  type: 'network' | 'api' | 'timeout' | 'validation'
  details?: unknown
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

    // Get auth headers
    const authHeaders = await getAuthHeaders()

    // Make API call
    const response = await fetch(`${FASTAPI_URL}/api/v1/ocr/scan/ocr-expiry/${storeId}`, {
      method: 'POST',
      body: formData,
      headers: {
        ...authHeaders,
        // Don't set Content-Type - let browser set it with boundary for FormData
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error ${response.status}: ${errorText}`)
    }

    const data: OCRUploadResponse = await response.json()
    const processingTime = Date.now() - startTime

    // Transform API response to ExpiryDateInfo
    return {
      extractedDate: data.expiry_date || undefined,
      confidence: data.confidence_threshold || 0.65,
      isManual: false,
      rawOcrText: 'OCR processing completed',
      processingTime,
    }
  } catch (error) {
    console.error('OCR extraction failed:', error)

    // Create OCR error with type classification
    const ocrError: OCRError = {
      message: error instanceof Error ? error.message : 'Unknown OCR error',
      type: 'api',
      details: error,
    }

    // Classify error type
    if (error instanceof TypeError && error.message.includes('fetch')) {
      ocrError.type = 'network'
    } else if (error instanceof Error && error.message.includes('timeout')) {
      ocrError.type = 'timeout'
    } else if (error instanceof Error && error.message.includes('validation')) {
      ocrError.type = 'validation'
    }

    throw ocrError
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

    // Get auth headers
    const authHeaders = await getAuthHeaders()

    // Make API call
    const response = await fetch(`${FASTAPI_URL}/api/v1/ocr/scan/full-ocr/${storeId}`, {
      method: 'POST',
      body: formData,
      headers: {
        ...authHeaders,
      },
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

    const ocrError: OCRError = {
      message: error instanceof Error ? error.message : 'Unknown OCR error',
      type: 'api',
      details: error,
    }

    // Classify error type
    if (error instanceof TypeError && error.message.includes('fetch')) {
      ocrError.type = 'network'
    } else if (error instanceof Error && error.message.includes('timeout')) {
      ocrError.type = 'timeout'
    } else if (error instanceof Error && error.message.includes('validation')) {
      ocrError.type = 'validation'
    }

    throw ocrError
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

    // Get auth headers
    const authHeaders = await getAuthHeaders()

    const response = await fetch(`${FASTAPI_URL}/api/v1/ocr/scan/text-extraction/${storeId}`, {
      method: 'POST',
      body: formData,
      headers: {
        ...authHeaders,
      },
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
  // Create canvas with video dimensions
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  canvas.width = videoElement.videoWidth || videoElement.width
  canvas.height = videoElement.videoHeight || videoElement.height

  // Draw video frame to canvas
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

  // Convert canvas to blob
  return canvasToBlob(canvas, quality)
}

/**
 * Utility function to check if FastAPI backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${FASTAPI_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })

    return response.ok
  } catch (error) {
    console.warn('FastAPI backend not available:', error)
    return false
  }
}
