/**
 * Mock OCR API Route for Delivery Note Upload
 *
 * This endpoint simulates the backend OCR service while it's being developed.
 * Returns the same CsvPreviewItem[] structure used by the CSV upload flow.
 *
 * TODO: Replace with real OCR API when backend is ready
 * Real API should be at: /api/delivery-note-ocr (remove /mock)
 */

import { type NextRequest, NextResponse } from 'next/server'
import { getMockDeliveryData } from '@/lib/mock-data/delivery-note-samples'
import type { DeliveryScenario } from '@/lib/mock-data/delivery-note-samples'

// Simulate realistic OCR processing time (2-3 seconds)
const MIN_PROCESSING_TIME = 2000 // 2 seconds
const MAX_PROCESSING_TIME = 3000 // 3 seconds

/**
 * Mock OCR endpoint for delivery note image uploads
 *
 * @param request - Multipart form data with image file
 * @returns CsvPreviewItem[] - Same structure as CSV upload
 *
 * Query parameters:
 * - scenario: 'small' | 'medium' | 'large' | 'problematic' | 'random'
 * - delay: Override processing delay in milliseconds (for testing)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        {
          error: 'No file provided',
          details: 'Request must include a file in multipart/form-data format',
        },
        { status: 400 },
      )
    }

    // Validate file type (images and PDFs)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          details: `File must be one of: ${validTypes.join(', ')}. Received: ${file.type}`,
        },
        { status: 400 },
      )
    }

    // Validate file size (max 5MB for images)
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          details: `Maximum file size is 5MB. Received: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        },
        { status: 400 },
      )
    }

    // Get scenario from query params (default: random)
    const { searchParams } = new URL(request.url)
    const scenario = (searchParams.get('scenario') || 'random') as DeliveryScenario
    const customDelay = searchParams.get('delay')

    // Simulate OCR processing time
    const processingTime = customDelay
      ? parseInt(customDelay, 10)
      : Math.random() * (MAX_PROCESSING_TIME - MIN_PROCESSING_TIME) + MIN_PROCESSING_TIME

    await new Promise(resolve => setTimeout(resolve, processingTime))

    // Get mock data for the selected scenario
    const mockData = getMockDeliveryData(scenario)

    // Return successful OCR result
    // Structure matches CsvPreviewItem[] from use-csv-upload.ts
    return NextResponse.json(
      {
        success: true,
        data: mockData,
        metadata: {
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          items_extracted: mockData.length,
          processing_time_ms: Math.round(processingTime),
          scenario_used: scenario,
          ocr_confidence: 0.95, // Mock confidence score
          mock: true, // Flag to indicate this is mock data
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Mock OCR API error:', error)

    return NextResponse.json(
      {
        error: 'OCR processing failed',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        mock: true,
      },
      { status: 500 },
    )
  }
}

/**
 * GET endpoint for testing/health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'operational',
    endpoint: '/api/delivery-note-ocr/mock',
    description: 'Mock OCR service for delivery note image processing',
    usage: {
      method: 'POST',
      content_type: 'multipart/form-data',
      required_fields: ['file'],
      supported_formats: ['image/jpeg', 'image/png', 'application/pdf'],
      max_file_size: '5MB',
      query_params: {
        scenario: "Optional: 'small' | 'medium' | 'large' | 'problematic' | 'random' (default)",
        delay: 'Optional: Custom processing delay in milliseconds',
      },
    },
    scenarios: {
      small: '3 items - typical corner store',
      medium: '10 items - small supermarket',
      large: '25 items - test pagination',
      problematic: 'Various validation issues for testing error handling',
      random: 'Randomly selects one of the above scenarios',
    },
    mock: true,
    note: 'This is a mock endpoint. Replace with real OCR API at /api/delivery-note-ocr when backend is ready.',
  })
}
