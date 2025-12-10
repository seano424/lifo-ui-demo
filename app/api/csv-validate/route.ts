// app/api/csv-validate/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    logger.log('csv-validate', 'Received CSV validation request')

    // Verify authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.error('csv-validate', 'Authentication failed', { error: authError })
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get the form data
    const formData = await request.formData()
    const file = formData.get('file')
    const storeId = formData.get('store_id')

    if (!file || !(file instanceof File)) {
      logger.error('csv-validate', 'No file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!storeId || typeof storeId !== 'string') {
      logger.error('csv-validate', 'No store ID provided')
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 })
    }

    logger.log('csv-validate', 'Processing CSV validation', {
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
      logger.error('csv-validate', 'Failed to get user session', { error: sessionError })
      return NextResponse.json({ error: 'Authentication session required' }, { status: 401 })
    }

    // Forward to FastAPI validate endpoint
    const fastapiUrl = process.env.FASTAPI_URL
    if (!fastapiUrl) {
      logger.error('csv-validate', 'FASTAPI_URL not configured')
      return NextResponse.json({ error: 'Backend configuration error' }, { status: 500 })
    }

    const validateUrl = `${fastapiUrl}/api/v1/csv-upload/validate`

    // Create FormData for FastAPI
    const fastApiFormData = new FormData()
    fastApiFormData.append('file', file)
    fastApiFormData.append('store_id', storeId)

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      logger.log('csv-validate', 'Sending file to backend for validation', {
        fileName: file.name,
        fileSize: file.size,
        storeId,
      })
    }

    const startTime = Date.now()

    // Use user's JWT token for validation
    const response = await fetch(validateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: fastApiFormData,
    })

    const processingTime = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('csv-validate', 'FastAPI validation failed', {
        status: response.status,
        errorText,
        processingTime,
      })

      // Debug: Log error response in development
      if (process.env.NODE_ENV === 'development') {
        logger.error('csv-validate', 'Backend error response', {
          status: response.status,
          errorPreview: errorText.substring(0, 500),
          fullLength: errorText.length,
        })
      }

      let errorMessage = 'Validation failed'
      let errorDetails: unknown = null

      try {
        const errorJson = JSON.parse(errorText) as Record<string, unknown>

        // Type-safe error extraction
        if (typeof errorJson.error === 'string') {
          errorMessage = errorJson.error
        } else if (typeof errorJson.message === 'string') {
          errorMessage = errorJson.message
        } else if (typeof errorJson.detail === 'string') {
          errorMessage = errorJson.detail
        }

        errorDetails = errorJson
      } catch (_parseError) {
        errorMessage = errorText || errorMessage
      }

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
      logger.log('csv-validate', 'Backend validation response received', {
        success: result.success,
        validItems: result.validation_results?.valid_items,
        invalidItems: result.validation_results?.invalid_items,
        hasErrors: result.has_validation_errors,
      })
    }

    logger.log('csv-validate', 'CSV validation completed', {
      validItems: result.validation_results?.valid_items || 0,
      invalidItems: result.validation_results?.invalid_items || 0,
      hasErrors: result.has_validation_errors || false,
      processingTime,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error('csv-validate', 'Validation error', {
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
