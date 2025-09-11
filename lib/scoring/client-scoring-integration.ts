/**
 * Client-side FastAPI Scoring Integration
 * For use in browser/React components (scan-in flow)
 */

import { createClient } from '@/lib/supabase/client'

/**
 * Client-side scoring after scan-in (simplified version for React components)
 */
export async function scoreAfterScanInClient(
  storeId: string,
  _batchId: string,
): Promise<{
  attempted: boolean
  success: boolean
  processed: number
  high_priority_count: number
  processing_time_ms: number
  warning?: string
}> {
  const startTime = Date.now()

  // Check if auto-scoring is enabled
  if (process.env.NEXT_PUBLIC_ENABLE_AUTO_SCORING === 'false') {
    return {
      attempted: false,
      success: false,
      processed: 0,
      high_priority_count: 0,
      processing_time_ms: 0,
    }
  }

  // Skip scoring in development only if explicitly disabled
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_DISABLE_DEV_SCORING === 'true'
  ) {
    return {
      attempted: false,
      success: false,
      processed: 0,
      high_priority_count: 0,
      processing_time_ms: Date.now() - startTime,
      warning: 'Scoring disabled in development environment',
    }
  }

  try {
    const supabase = createClient()

    // Get current session for authentication
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()
    if (sessionError || !session?.access_token) {
      console.error('[CLIENT-SCORING] Session required:', sessionError?.message)
      return {
        attempted: true,
        success: false,
        processed: 0,
        high_priority_count: 0,
        processing_time_ms: Date.now() - startTime,
        warning: 'Authentication required for scoring. Please refresh the page.',
      }
    }

    // Call FastAPI scoring endpoint
    const fastApiBaseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'
    console.log(
      '[CLIENT-SCORING] Attempting to score batch for store:',
      storeId,
      'using FastAPI:',
      fastApiBaseUrl,
    )
    const endpoint = `${fastApiBaseUrl}/api/v1/scoring/batch/${storeId}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout for scan-in

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[CLIENT-SCORING] FastAPI error:', {
          status: response.status,
          error: errorText,
        })

        return {
          attempted: true,
          success: false,
          processed: 0,
          high_priority_count: 0,
          processing_time_ms: Date.now() - startTime,
          warning: getClientErrorMessage(response.status),
        }
      }

      const data = await response.json()

      return {
        attempted: true,
        success: true,
        processed: data.processed,
        high_priority_count: data.high_priority_count,
        processing_time_ms: Date.now() - startTime,
      }
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    console.error('[CLIENT-SCORING] Scoring error:', error)

    const isTimeout = error instanceof Error && error.name === 'AbortError'
    const warning = isTimeout
      ? 'Product added successfully. Scoring is taking longer than usual and will complete in the background.'
      : 'Product added successfully. Scoring will be calculated in the background.'

    return {
      attempted: true,
      success: false,
      processed: 0,
      high_priority_count: 0,
      processing_time_ms: Date.now() - startTime,
      warning,
    }
  }
}

/**
 * Generate user-friendly error messages for client-side errors
 */
function getClientErrorMessage(status: number): string {
  switch (status) {
    case 401:
    case 403:
      return 'Product added successfully. Please refresh the page to re-authenticate for scoring.'
    case 429:
      return 'Product added successfully. Scoring is temporarily rate-limited and will retry automatically.'
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Product added successfully. Scoring service is temporarily unavailable.'
    default:
      return 'Product added successfully. Scoring temporarily unavailable, will be calculated when service is restored.'
  }
}
