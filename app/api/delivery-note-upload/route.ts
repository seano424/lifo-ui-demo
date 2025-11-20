// app/api/delivery-note-upload/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * Delivery Note Upload API Route
 *
 * This endpoint receives validated batch data from the delivery note upload form
 * and forwards it to the FastAPI backend for batch creation.
 *
 * Flow:
 * 1. Frontend uploads image → OCR API extracts items → User validates
 * 2. Frontend sends validated items to this endpoint
 * 3. This endpoint authenticates user and forwards to FastAPI
 * 4. FastAPI creates batches/store products in database
 *
 * Note: This uses the same backend endpoint as CSV upload since both send
 * the same CsvPreviewItem[] structure after preprocessing.
 */

interface CsvPreviewItem {
  SKU: string
  Product_Name: string
  Category: string
  Quantity: number
  Expiry_Date: string
  Cost_Price: number
  Selling_Price: number
  [key: string]: string | number
}

interface DeliveryNoteUploadRequest {
  store_id: string
  items: CsvPreviewItem[]
}

export async function POST(request: NextRequest) {
  try {
    logger.log('delivery-note-upload', 'Received delivery note upload request')

    // Verify authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.error('delivery-note-upload', 'Authentication failed', { error: authError })
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse JSON body
    const body = (await request.json()) as DeliveryNoteUploadRequest

    if (!body.store_id || typeof body.store_id !== 'string') {
      logger.error('delivery-note-upload', 'No store ID provided')
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 })
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      logger.error('delivery-note-upload', 'No items provided')
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 })
    }

    logger.log('delivery-note-upload', 'Processing delivery note upload', {
      itemCount: body.items.length,
      storeId: body.store_id,
      userId: user.id,
    })

    // Get user's session token to pass to FastAPI
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      logger.error('delivery-note-upload', 'Failed to get user session', { error: sessionError })
      return NextResponse.json({ error: 'Authentication session required' }, { status: 401 })
    }

    // Forward to FastAPI backend
    const fastapiUrl = process.env.FASTAPI_URL
    if (!fastapiUrl) {
      logger.error('delivery-note-upload', 'FASTAPI_URL not configured')
      return NextResponse.json({ error: 'Backend configuration error' }, { status: 500 })
    }

    // Convert items to CSV format for backend (same as CSV upload)
    // Backend expects CSV file, so we convert JSON to CSV format
    const csvContent = convertItemsToCSV(body.items)
    const csvFile = new File([csvContent], 'delivery-note.csv', { type: 'text/csv' })

    // Create FormData for FastAPI
    const uploadUrl = `${fastapiUrl}/api/v1/csv-upload/upload-and-create-batches`
    const formData = new FormData()
    formData.append('file', csvFile)
    formData.append('store_id', body.store_id)
    formData.append('chunk_size', '100')

    if (process.env.NODE_ENV === 'development') {
      logger.log('delivery-note-upload', 'Sending data to backend', {
        itemCount: body.items.length,
        storeId: body.store_id,
        csvSize: csvContent.length,
      })
    }

    const startTime = Date.now()

    // Forward to backend with user's JWT token (ensures RLS policies are enforced)
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    })

    const processingTime = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('delivery-note-upload', 'FastAPI upload failed', {
        status: response.status,
        errorText,
        processingTime,
      })

      if (process.env.NODE_ENV === 'development') {
        logger.error('delivery-note-upload', 'Backend error response', {
          status: response.status,
          errorPreview: errorText.substring(0, 500),
        })
      }

      let errorMessage = 'Upload failed'
      let errorDetails: unknown = null

      try {
        const errorJson = JSON.parse(errorText) as Record<string, unknown>

        if (typeof errorJson.error === 'string') {
          errorMessage = errorJson.error
        } else if (typeof errorJson.message === 'string') {
          errorMessage = errorJson.message
        } else if (typeof errorJson.detail === 'string') {
          errorMessage = errorJson.detail
        }

        errorDetails = errorJson
      } catch {
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

    if (process.env.NODE_ENV === 'development') {
      logger.log('delivery-note-upload', 'Backend response received', {
        success: result.success,
        totalItems: result.csv_processing?.total_csv_items,
        successfulBatches: result.batch_creation?.successful_batches,
        successfulStoreProducts: result.store_product_creation?.successful,
      })
    }

    // Normalize response (same as CSV upload)
    const totalCsvRows = result.csv_processing?.total_csv_items || 0
    const successfulBatches = result.batch_creation?.successful_batches || 0
    const successfulStoreProducts = result.store_product_creation?.successful || 0
    const failedBatches = result.batch_creation?.failed_batches || 0
    const failedStoreProducts = result.store_product_creation?.failed || 0

    const totalProcessed = successfulBatches + successfulStoreProducts
    const totalFailed = failedBatches + failedStoreProducts
    const skippedCount = Math.max(0, totalCsvRows - totalProcessed - totalFailed)

    const normalizedResponse = {
      success: result.success,
      message: result.message,
      processed: totalProcessed,
      skipped: skippedCount,
      total_items: totalCsvRows,
      processing_time_ms: result.performance_metrics?.total_processing_ms || 0,
      errors: result.failed_items?.map((item: { error: string }) => item.error) || [],
      failed_items: result.failed_items || [],
      csv_warnings: result.csv_processing?.csv_warnings || [],
      duplicates_skipped: result.duplicates_skipped || [],
      batches_created: successfulBatches,
      store_products_created: successfulStoreProducts,
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

    logger.log('delivery-note-upload', 'Upload completed', {
      processed: normalizedResponse.processed,
      batches: normalizedResponse.batches_created,
      storeProducts: normalizedResponse.store_products_created,
      failed: totalFailed,
      skipped: normalizedResponse.skipped,
      total: normalizedResponse.total_items,
      processingTime,
    })

    // If all items failed, return error
    if (normalizedResponse.processed === 0 && normalizedResponse.total_items > 0) {
      logger.error('delivery-note-upload', 'All items failed validation', {
        total: normalizedResponse.total_items,
        errors: normalizedResponse.errors.slice(0, 5),
      })

      return NextResponse.json(
        {
          error: `All ${normalizedResponse.total_items} items failed validation`,
          details: normalizedResponse.failed_items.slice(0, 10),
          common_errors: [...new Set(normalizedResponse.errors)].slice(0, 3),
          full_result: normalizedResponse,
        },
        { status: 422 },
      )
    }

    return NextResponse.json(normalizedResponse)
  } catch (error) {
    logger.error('delivery-note-upload', 'Upload error', {
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

/**
 * Convert items array to CSV format for backend
 */
function convertItemsToCSV(items: CsvPreviewItem[]): string {
  // CSV headers (normalized format expected by backend)
  const headers = [
    'sku',
    'product_name',
    'category',
    'quantity',
    'expiry_date',
    'cost_price',
    'selling_price',
  ]

  const rows = [headers.join(',')]

  items.forEach(item => {
    const values = [
      item.SKU || '',
      item.Product_Name || '',
      item.Category || '',
      item.Quantity.toString(),
      item.Expiry_Date || '',
      item.Cost_Price.toFixed(2),
      item.Selling_Price.toFixed(2),
    ]

    // Escape CSV special characters
    const escapedValues = values.map(v =>
      v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')
        ? `"${v.replace(/"/g, '""')}"`
        : v,
    )
    rows.push(escapedValues.join(','))
  })

  return rows.join('\n')
}
