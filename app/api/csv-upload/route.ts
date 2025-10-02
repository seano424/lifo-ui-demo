// app/api/csv-upload/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

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

    // Forward to FastAPI with service role key
    const fastapiUrl = process.env.FASTAPI_URL
    if (!fastapiUrl) {
      logger.error('csv-upload', 'FASTAPI_URL not configured')
      return NextResponse.json({ error: 'Backend configuration error' }, { status: 500 })
    }

    const uploadUrl = `${fastapiUrl}/api/v1/csv-upload/upload`

    // Create new FormData for FastAPI
    const fastApiFormData = new FormData()
    fastApiFormData.append('file', file)
    fastApiFormData.append('store_id', storeId)

    const startTime = Date.now()

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
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

      let errorMessage = 'Upload failed'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorJson.detail || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }

      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    const result = await response.json()

    logger.log('csv-upload', 'CSV upload completed successfully', {
      processed: result.processed,
      total: result.total_items,
      processingTime,
    })

    return NextResponse.json(result)
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
