// app/api/csv-upload/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

interface BackendErrorResponse {
  error?: string | object
  message?: string
  detail?: string | object
  status?: number
}

export async function POST(request: NextRequest) {
  try {
    logger.log('csv-upload', 'Received CSV upload request')

    // Verify authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.error('csv-upload', 'Authentication failed', { error: authError })
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get the form data
    const formData = await request.formData()
    const file = formData.get('file')
    const storeId = formData.get('store_id')

    if (!file || !(file instanceof File)) {
      logger.error('csv-upload', 'No file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!storeId || typeof storeId !== 'string') {
      logger.error('csv-upload', 'No store ID provided')
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 })
    }

    logger.log('csv-upload', 'Processing CSV upload', {
      fileName: file.name,
      fileSize: file.size,
      storeId,
      userId: user.id,
    })

    // Get user's session token to pass to FastAPI
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      logger.error('csv-upload', 'Failed to get user session', { error: sessionError })
      return NextResponse.json({ error: 'Authentication session required' }, { status: 401 })
    }

    // Forward to FastAPI with user's JWT token (not service role key)
    const fastapiUrl = process.env.FASTAPI_URL
    if (!fastapiUrl) {
      logger.error('csv-upload', 'FASTAPI_URL not configured')
      return NextResponse.json({ error: 'Backend configuration error' }, { status: 500 })
    }

    // ✅ FIX: Use the endpoint that actually creates batches in the database
    // The /upload endpoint only validates, /upload-and-create-batches actually persists data
    const uploadUrl = `${fastapiUrl}/api/v1/csv-upload/upload-and-create-batches`

    // Create FormData for FastAPI - file is already normalized by frontend
    const fastApiFormData = new FormData()
    fastApiFormData.append('file', file)
    fastApiFormData.append('store_id', storeId)

    // Debug logging (without consuming file stream)
    if (process.env.NODE_ENV === 'development') {
      logger.log('csv-upload', 'Sending file to backend', {
        fileName: file.name,
        fileSize: file.size,
        storeId,
      })
    }

    const startTime = Date.now()

    // ✅ SECURITY: Use user's JWT token instead of service role key
    // This ensures RLS policies are enforced
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: fastApiFormData,
    })

    const processingTime = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('csv-upload', 'FastAPI upload failed', {
        status: response.status,
        errorText,
        processingTime,
      })

      // Debug: Log error response in development
      if (process.env.NODE_ENV === 'development') {
        logger.error('csv-upload', 'Backend error response', {
          status: response.status,
          errorPreview: errorText.substring(0, 500),
          fullLength: errorText.length,
        })
      }

      let errorMessage = 'Upload failed'
      let errorDetails: BackendErrorResponse | null = null

      try {
        const errorJson = JSON.parse(errorText) as BackendErrorResponse

        // Extract error message from various possible fields and ensure it's a string
        const rawError = errorJson.error || errorJson.message || errorJson.detail
        if (rawError) {
          errorMessage = typeof rawError === 'string' ? rawError : JSON.stringify(rawError)
        }

        // Preserve full error details for debugging
        errorDetails = errorJson

        if (process.env.NODE_ENV === 'development') {
          console.error('🔍 [CSV-API-ERROR] Parsed error:', {
            message: errorMessage,
            hasDetails: !!errorDetails,
            detailKeys: errorDetails ? Object.keys(errorDetails) : [],
          })
        }
      } catch (parseError) {
        errorMessage = errorText || errorMessage
        if (process.env.NODE_ENV === 'development') {
          console.error('🔍 [CSV-API-ERROR] Failed to parse error JSON:', parseError)
        }
      }

      // Return error message, only include details in development
      return NextResponse.json(
        {
          error: errorMessage,
          ...(process.env.NODE_ENV === 'development' && { details: errorDetails }),
          status: response.status,
        },
        { status: response.status },
      )
    }

    const result = await response.json()

    // Debug logging for development
    if (process.env.NODE_ENV === 'development') {
      logger.log('csv-upload', 'Backend response received', {
        success: result.success,
        totalItems: result.data_summary?.total_items,
        successfulBatches: result.batch_creation?.successful_batches,
      })
    }

    // ✅ FIX: Map backend response to frontend-expected format
    // Backend uses different field names than frontend expects
    const totalItems = result.data_summary?.total_items || 0
    const successfulBatches = result.batch_creation?.successful_batches || 0
    const failedBatches = result.batch_creation?.failed_batches || 0

    // Calculate skipped: items that weren't processed (likely duplicates)
    // skipped = total - (successful + failed)
    const skippedCount = Math.max(0, totalItems - successfulBatches - failedBatches)

    const normalizedResponse = {
      success: result.success,
      message: result.message,
      processed: successfulBatches,
      skipped: skippedCount, // ✅ Fixed: Calculate actual skipped items (duplicates)
      total_items: totalItems,
      processing_time_ms: result.performance_metrics?.total_processing_ms || 0,
      errors: result.failed_items?.map((item: { error: string }) => item.error) || [],
      failed_items: result.failed_items || [],
      csv_warnings: result.csv_processing?.csv_warnings || [],
      duplicates_skipped: result.duplicates_skipped || [], // Pass through duplicate details if backend provides them
      performance_metrics: {
        items_per_second: result.performance_metrics?.items_per_second || 0,
        duplicate_detection_ms: result.performance_metrics?.duplicate_detection_ms || 0,
        product_resolution_ms: result.performance_metrics?.product_resolution_ms || 0,
        batch_insertion_ms: result.performance_metrics?.batch_insertion_ms || 0,
        database_processing_time_ms: result.performance_metrics?.database_operations_ms || 0,
        products_created: result.batch_creation?.product_statistics?.created_products,
        updated_products: result.batch_creation?.product_statistics?.updated_products,
      },
    }

    logger.log('csv-upload', 'CSV upload completed', {
      processed: normalizedResponse.processed,
      failed: normalizedResponse.skipped,
      total: normalizedResponse.total_items,
      processingTime,
    })

    // ⚠️ If all items failed, return appropriate error
    if (normalizedResponse.processed === 0 && normalizedResponse.total_items > 0) {
      logger.error('csv-upload', 'All items failed validation', {
        total: normalizedResponse.total_items,
        errors: normalizedResponse.errors.slice(0, 5), // Log first 5 errors
      })

      return NextResponse.json(
        {
          error: `All ${normalizedResponse.total_items} items failed validation`,
          details: normalizedResponse.failed_items.slice(0, 10), // Show first 10 failures
          common_errors: [...new Set(normalizedResponse.errors)].slice(0, 3), // Unique errors
          full_result: normalizedResponse,
        },
        { status: 422 },
      )
    }

    return NextResponse.json(normalizedResponse)
  } catch (error) {
    logger.error('csv-upload', 'Upload error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
