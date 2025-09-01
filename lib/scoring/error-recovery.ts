/**
 * Error Recovery and Monitoring for FastAPI Scoring Integration
 * Handles retries, circuit breakers, and graceful degradation
 */

interface RetryConfig {
  maxAttempts: number
  initialDelay: number
  backoffMultiplier: number
  maxDelay: number
}

interface CircuitBreakerState {
  isOpen: boolean
  failureCount: number
  lastFailureTime: number
  nextRetryTime: number
}

// Circuit breaker states per store to prevent cascading failures
const circuitBreakers = new Map<string, CircuitBreakerState>()

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000,
}

/**
 * Enhanced retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: { storeId: string; operation: string } = { storeId: 'unknown', operation: 'scoring' },
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const result = await operation()

      // Success - reset circuit breaker if it was open
      if (circuitBreakers.has(context.storeId)) {
        circuitBreakers.delete(context.storeId)
        console.log(`[ERROR-RECOVERY] Circuit breaker reset for store ${context.storeId}`)
      }

      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')

      console.warn(`[ERROR-RECOVERY] Attempt ${attempt}/${finalConfig.maxAttempts} failed:`, {
        storeId: context.storeId,
        operation: context.operation,
        error: lastError.message,
        attempt,
      })

      // Don't retry on final attempt
      if (attempt === finalConfig.maxAttempts) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.initialDelay * finalConfig.backoffMultiplier ** (attempt - 1),
        finalConfig.maxDelay,
      )

      console.log(`[ERROR-RECOVERY] Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // Update circuit breaker after all retries failed
  updateCircuitBreaker(context.storeId, lastError!)
  throw lastError!
}

/**
 * Circuit breaker implementation to prevent cascading failures
 */
function updateCircuitBreaker(storeId: string, error: Error): void {
  const now = Date.now()
  const state = circuitBreakers.get(storeId) || {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: 0,
    nextRetryTime: 0,
  }

  state.failureCount += 1
  state.lastFailureTime = now

  // Open circuit breaker after 3 consecutive failures
  if (state.failureCount >= 3) {
    state.isOpen = true
    state.nextRetryTime = now + 5 * 60 * 1000 // 5 minutes

    console.error(`[ERROR-RECOVERY] Circuit breaker OPENED for store ${storeId}`, {
      failureCount: state.failureCount,
      nextRetryTime: new Date(state.nextRetryTime).toISOString(),
      lastError: error.message,
    })
  }

  circuitBreakers.set(storeId, state)
}

/**
 * Check if circuit breaker allows requests
 */
export function isCircuitBreakerOpen(storeId: string): boolean {
  const state = circuitBreakers.get(storeId)
  if (!state || !state.isOpen) {
    return false
  }

  const now = Date.now()

  // Try to close circuit breaker after timeout
  if (now >= state.nextRetryTime) {
    console.log(`[ERROR-RECOVERY] Circuit breaker attempting to close for store ${storeId}`)
    state.isOpen = false
    state.failureCount = 0
    circuitBreakers.set(storeId, state)
    return false
  }

  return true
}

/**
 * Enhanced error classification for better handling
 */
export enum ScoringErrorType {
  NETWORK_ERROR = 'network',
  TIMEOUT = 'timeout',
  AUTHENTICATION = 'auth',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  SERVICE_UNAVAILABLE = 'unavailable',
  UNKNOWN = 'unknown',
}

export function classifyError(error: unknown): ScoringErrorType {
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message.toLowerCase()
      : ''
  const details =
    error && typeof error === 'object' && 'details' in error && typeof error.details === 'string'
      ? error.details.toLowerCase()
      : ''

  if (message.includes('timeout') || message.includes('abort')) {
    return ScoringErrorType.TIMEOUT
  }

  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('econnrefused')
  ) {
    return ScoringErrorType.NETWORK_ERROR
  }

  if (message.includes('auth') || details.includes('unauthorized') || details.includes('401')) {
    return ScoringErrorType.AUTHENTICATION
  }

  if (details.includes('429') || message.includes('rate limit')) {
    return ScoringErrorType.RATE_LIMIT
  }

  if (details.includes('503') || details.includes('502') || details.includes('504')) {
    return ScoringErrorType.SERVICE_UNAVAILABLE
  }

  if (details.includes('500') || details.includes('internal server')) {
    return ScoringErrorType.SERVER_ERROR
  }

  return ScoringErrorType.UNKNOWN
}

/**
 * Determine retry strategy based on error type
 */
export function getRetryConfig(
  errorType: ScoringErrorType,
  operation: 'csv_upload' | 'scan_in',
): RetryConfig {
  const baseConfig = {
    csv_upload: {
      maxAttempts: 2, // Less aggressive for bulk operations
      initialDelay: 2000,
      backoffMultiplier: 2,
      maxDelay: 15000,
    },
    scan_in: {
      maxAttempts: 3, // More aggressive for individual items
      initialDelay: 1000,
      backoffMultiplier: 1.5,
      maxDelay: 8000,
    },
  }

  const config = baseConfig[operation]

  // Adjust based on error type
  switch (errorType) {
    case ScoringErrorType.RATE_LIMIT:
      return {
        ...config,
        maxAttempts: 2,
        initialDelay: 5000, // Longer delay for rate limits
        maxDelay: 20000,
      }

    case ScoringErrorType.TIMEOUT:
      return {
        ...config,
        maxAttempts: 2, // Fewer retries for timeouts
        initialDelay: 3000,
      }

    case ScoringErrorType.AUTHENTICATION:
      return {
        ...config,
        maxAttempts: 1, // Don't retry auth errors
      }

    case ScoringErrorType.SERVICE_UNAVAILABLE:
      return {
        ...config,
        maxAttempts: 1, // Don't hammer unavailable service
      }

    default:
      return config
  }
}

/**
 * Generate user-friendly error messages
 */
export function generateUserMessage(
  errorType: ScoringErrorType,
  operation: 'csv_upload' | 'scan_in',
): string {
  const baseMessage =
    operation === 'csv_upload'
      ? 'CSV upload completed successfully.'
      : 'Product added successfully.'

  switch (errorType) {
    case ScoringErrorType.TIMEOUT:
      return `${baseMessage} Scoring is taking longer than usual and will complete in the background.`

    case ScoringErrorType.RATE_LIMIT:
      return `${baseMessage} Scoring is temporarily rate-limited and will retry automatically.`

    case ScoringErrorType.AUTHENTICATION:
      return `${baseMessage} Please refresh the page to re-authenticate for scoring.`

    case ScoringErrorType.SERVICE_UNAVAILABLE:
      return `${baseMessage} Scoring service is temporarily unavailable.`

    case ScoringErrorType.NETWORK_ERROR:
      return `${baseMessage} Network connectivity affected scoring, will retry automatically.`

    case ScoringErrorType.SERVER_ERROR:
      return `${baseMessage} Scoring encountered a server error and will retry automatically.`

    default:
      return `${baseMessage} Scoring temporarily unavailable, will be calculated when service is restored.`
  }
}

/**
 * Enhanced monitoring and metrics collection
 */
export interface ScoringMetrics {
  storeId: string
  operation: 'csv_upload' | 'scan_in'
  success: boolean
  errorType?: ScoringErrorType
  attemptCount: number
  totalDuration: number
  fastApiDuration?: number
  batchCount: number
  timestamp: string
}

const scoringMetrics: ScoringMetrics[] = []
const MAX_METRICS = 1000 // Keep last 1000 operations

export function recordScoringMetrics(metrics: ScoringMetrics): void {
  metrics.timestamp = new Date().toISOString()
  scoringMetrics.push(metrics)

  // Keep only recent metrics
  if (scoringMetrics.length > MAX_METRICS) {
    scoringMetrics.splice(0, scoringMetrics.length - MAX_METRICS)
  }

  // Log for monitoring
  if (metrics.success) {
    console.log('[SCORING-METRICS] Success:', {
      storeId: metrics.storeId,
      operation: metrics.operation,
      duration: metrics.totalDuration,
      batchCount: metrics.batchCount,
      attempts: metrics.attemptCount,
    })
  } else {
    console.error('[SCORING-METRICS] Failure:', {
      storeId: metrics.storeId,
      operation: metrics.operation,
      errorType: metrics.errorType,
      duration: metrics.totalDuration,
      attempts: metrics.attemptCount,
    })
  }
}

/**
 * Get scoring health metrics for monitoring
 */
export function getScoringHealthMetrics(): {
  totalOperations: number
  successRate: number
  avgDuration: number
  errorsByType: Record<string, number>
  circuitBreakersOpen: number
} {
  const recent = scoringMetrics.slice(-100) // Last 100 operations
  const successful = recent.filter(m => m.success)

  const errorsByType: Record<string, number> = {}
  recent
    .filter(m => !m.success)
    .forEach(m => {
      const type = m.errorType || ScoringErrorType.UNKNOWN
      errorsByType[type] = (errorsByType[type] || 0) + 1
    })

  const openCircuitBreakers = Array.from(circuitBreakers.values()).filter(
    state => state.isOpen,
  ).length

  return {
    totalOperations: recent.length,
    successRate: recent.length > 0 ? successful.length / recent.length : 0,
    avgDuration:
      recent.length > 0 ? recent.reduce((sum, m) => sum + m.totalDuration, 0) / recent.length : 0,
    errorsByType,
    circuitBreakersOpen: openCircuitBreakers,
  }
}
