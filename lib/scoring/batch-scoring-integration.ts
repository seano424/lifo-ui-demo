/**
 * FastAPI Scoring Integration Helper
 * Integrates batch creation flows with automatic scoring
 */

import { createClient } from '@/lib/supabase/server'
import {
  classifyError,
  generateUserMessage,
  getRetryConfig,
  isCircuitBreakerOpen,
  recordScoringMetrics,
  retryWithBackoff,
  ScoringErrorType,
} from './error-recovery'

interface ScoringResponse {
  store_id: string
  total_items: number
  processed: number
  high_priority_count: number
  processing_time_ms: number
  errors: string[]
  message: string
}

interface ScoringError {
  success: false
  error: string
  details?: string
  store_id: string
}

interface ScoringSuccess {
  success: true
  data: ScoringResponse
  store_id: string
}

type ScoringResult = ScoringSuccess | ScoringError

/**
 * Main integration function to score batches after creation
 * Handles both single batch and bulk scoring scenarios
 */
export async function scoreBatchesAfterCreation(
  storeId: string,
  options: {
    operation: 'csv_upload' | 'scan_in'
    batchIds?: string[]
    force_recalculate?: boolean
    timeout?: number
  } = { operation: 'scan_in' },
): Promise<ScoringResult> {
  const startTime = Date.now()
  let attemptCount = 0

  console.log('[SCORING-INTEGRATION] Starting batch scoring:', {
    storeId,
    operation: options.operation,
    batchCount: options.batchIds?.length || 'all',
    force_recalculate: options.force_recalculate || false,
  })

  // Check circuit breaker
  if (isCircuitBreakerOpen(storeId)) {
    console.warn('[SCORING-INTEGRATION] Circuit breaker open, skipping scoring:', storeId)
    const result: ScoringResult = {
      success: false,
      error: 'Scoring service temporarily unavailable (circuit breaker open)',
      store_id: storeId,
    }

    recordScoringMetrics({
      storeId,
      operation: options.operation,
      success: false,
      errorType: ScoringErrorType.SERVICE_UNAVAILABLE,
      attemptCount: 0,
      totalDuration: Date.now() - startTime,
      batchCount: options.batchIds?.length || 0,
      timestamp: new Date().toISOString(),
    })

    return result
  }

  try {
    // Get authenticated supabase client
    const supabase = await createClient()

    // Get current user for FastAPI authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[SCORING-INTEGRATION] Authentication failed:', authError?.message)
      const result: ScoringResult = {
        success: false,
        error: 'Authentication required for scoring',
        store_id: storeId,
      }

      recordScoringMetrics({
        storeId,
        operation: options.operation,
        success: false,
        errorType: ScoringErrorType.AUTHENTICATION,
        attemptCount: 1,
        totalDuration: Date.now() - startTime,
        batchCount: options.batchIds?.length || 0,
        timestamp: new Date().toISOString(),
      })

      return result
    }

    // Get access token for FastAPI
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()
    if (sessionError || !session?.access_token) {
      console.error('[SCORING-INTEGRATION] Session token required:', sessionError?.message)
      const result: ScoringResult = {
        success: false,
        error: 'Authentication session required',
        store_id: storeId,
      }

      recordScoringMetrics({
        storeId,
        operation: options.operation,
        success: false,
        errorType: ScoringErrorType.AUTHENTICATION,
        attemptCount: 1,
        totalDuration: Date.now() - startTime,
        batchCount: options.batchIds?.length || 0,
        timestamp: new Date().toISOString(),
      })

      return result
    }

    // Enhanced scoring call with retry logic
    const scoringResult = await retryWithBackoff(
      async () => {
        attemptCount++
        return await callFastAPIScoring(storeId, session.access_token, {
          force_recalculate: options.force_recalculate || false,
          timeout: options.timeout || (options.operation === 'csv_upload' ? 60000 : 30000),
        })
      },
      getRetryConfig(ScoringErrorType.UNKNOWN, options.operation), // Will be refined based on actual error
      { storeId, operation: 'fastapi_scoring' },
    )

    const totalTime = Date.now() - startTime

    if (scoringResult.success) {
      console.log('[SCORING-INTEGRATION] Scoring completed successfully:', {
        storeId,
        processed: scoringResult.data.processed,
        high_priority: scoringResult.data.high_priority_count,
        processing_time_ms: scoringResult.data.processing_time_ms,
        total_integration_time_ms: totalTime,
        attempts: attemptCount,
      })

      recordScoringMetrics({
        storeId,
        operation: options.operation,
        success: true,
        attemptCount,
        totalDuration: totalTime,
        fastApiDuration: scoringResult.data.processing_time_ms,
        batchCount: scoringResult.data.processed,
        timestamp: new Date().toISOString(),
      })

      return scoringResult
    } else {
      console.error('[SCORING-INTEGRATION] Scoring failed after retries:', {
        storeId,
        error:
          'success' in scoringResult && !scoringResult.success
            ? scoringResult.error
            : 'Unknown error',
        total_time_ms: totalTime,
        attempts: attemptCount,
      })

      const errorType = classifyError(scoringResult)
      recordScoringMetrics({
        storeId,
        operation: options.operation,
        success: false,
        errorType,
        attemptCount,
        totalDuration: totalTime,
        batchCount: options.batchIds?.length || 0,
        timestamp: new Date().toISOString(),
      })

      return scoringResult
    }
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error('[SCORING-INTEGRATION] Integration error:', {
      storeId,
      operation: options.operation,
      error: error instanceof Error ? error.message : 'Unknown error',
      total_time_ms: totalTime,
      attempts: attemptCount,
    })

    const errorType = classifyError(error)
    recordScoringMetrics({
      storeId,
      operation: options.operation,
      success: false,
      errorType,
      attemptCount,
      totalDuration: totalTime,
      batchCount: options.batchIds?.length || 0,
      timestamp: new Date().toISOString(),
    })

    return {
      success: false,
      error: 'Scoring integration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      store_id: storeId,
    }
  }
}

/**
 * Call FastAPI scoring endpoint with proper authentication
 * Handles the HTTP request to the scoring microservice
 */
async function callFastAPIScoring(
  storeId: string,
  accessToken: string,
  options: {
    force_recalculate?: boolean
    timeout?: number
  } = {},
): Promise<ScoringResult> {
  const { force_recalculate = false, timeout = 30000 } = options

  try {
    console.log('[SCORING-INTEGRATION] Calling FastAPI scoring endpoint:', {
      storeId,
      force_recalculate,
      timeout,
    })

    // Construct FastAPI endpoint URL
    const fastApiBaseUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8000'
    const endpoint = `${fastApiBaseUrl}/api/v1/scoring/batch/${storeId}`

    const url = new URL(endpoint)
    if (force_recalculate) {
      url.searchParams.set('force_recalculate', 'true')
    }

    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[SCORING-INTEGRATION] FastAPI error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        })

        return {
          success: false,
          error: `FastAPI scoring failed: ${response.status} ${response.statusText}`,
          details: errorText,
          store_id: storeId,
        }
      }

      const data: ScoringResponse = await response.json()

      console.log('[SCORING-INTEGRATION] FastAPI scoring response:', {
        storeId,
        processed: data.processed,
        processing_time_ms: data.processing_time_ms,
        errors: data.errors.length,
      })

      return {
        success: true,
        data,
        store_id: storeId,
      }
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[SCORING-INTEGRATION] FastAPI request timeout:', { storeId, timeout })
      return {
        success: false,
        error: 'FastAPI scoring request timeout',
        details: `Request timed out after ${timeout}ms`,
        store_id: storeId,
      }
    }

    console.error('[SCORING-INTEGRATION] FastAPI request error:', {
      storeId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      success: false,
      error: 'Failed to connect to scoring service',
      details: error instanceof Error ? error.message : 'Unknown error',
      store_id: storeId,
    }
  }
}

/**
 * Wrapper for CSV upload scoring - optimized for bulk operations
 */
export async function scoreAfterCsvUpload(
  storeId: string,
  processedCount: number,
  options: {
    force_recalculate?: boolean
  } = {},
): Promise<ScoringResult> {
  console.log('[SCORING-INTEGRATION] CSV upload scoring requested:', {
    storeId,
    processedCount,
    force_recalculate: options.force_recalculate,
  })

  // For CSV uploads, always force recalculation since we just created new batches
  return scoreBatchesAfterCreation(storeId, {
    operation: 'csv_upload',
    force_recalculate: true, // Always recalculate for new batches
    timeout: Math.max(60000, processedCount * 100), // Scale timeout with batch count
  })
}

/**
 * Wrapper for scan-in scoring - optimized for single batch operations
 */
export async function scoreAfterScanIn(
  storeId: string,
  batchId: string,
  options: {
    force_recalculate?: boolean
  } = {},
): Promise<ScoringResult> {
  console.log('[SCORING-INTEGRATION] Scan-in scoring requested:', {
    storeId,
    batchId,
    force_recalculate: options.force_recalculate,
  })

  return scoreBatchesAfterCreation(storeId, {
    operation: 'scan_in',
    batchIds: [batchId],
    force_recalculate: options.force_recalculate || false,
    timeout: 30000, // Shorter timeout for single batch
  })
}

/**
 * Utility function to check if scoring should be attempted
 * Helps avoid unnecessary calls when FastAPI is down
 */
export async function canCallScoringService(): Promise<boolean> {
  try {
    const fastApiBaseUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8000'
    const healthEndpoint = `${fastApiBaseUrl}/health`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second health check

    try {
      const response = await fetch(healthEndpoint, {
        method: 'GET',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response.ok
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    console.warn('[SCORING-INTEGRATION] Scoring service health check failed:', error)
    return false
  }
}

/**
 * Enhanced error handler for scoring failures
 * Determines if batch creation should continue despite scoring failures
 */
export function handleScoringError(
  error: ScoringError,
  operation: 'csv_upload' | 'scan_in' = 'scan_in',
): {
  shouldFailBatchCreation: boolean
  userMessage: string
  logMessage: string
} {
  console.error('[SCORING-INTEGRATION] Handling scoring error:', error)

  // Scoring failures should never break batch creation
  const shouldFailBatchCreation = false

  // Classify the error for better handling
  const errorType = classifyError(error)

  // Generate user-friendly message
  const userMessage = generateUserMessage(errorType, operation)

  // Generate technical log message
  const logMessage = `Scoring ${errorType} for store ${error.store_id}: ${error.error}`

  return {
    shouldFailBatchCreation,
    userMessage,
    logMessage,
  }
}
