import { logger } from './logger'

export interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableErrors?: string[]
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 200,
  maxDelay: 2000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EPIPE', // Broken pipe - connection closed during write
    'ECONNABORTED', // Connection aborted
    'fetch failed',
  ],
}

/**
 * Check if an error is retryable based on error patterns
 *
 * @param error - The error to check
 * @param retryableErrors - Array of error patterns to match against (defaults to common connection errors)
 * @returns true if the error matches any retryable pattern
 *
 * @example
 * ```typescript
 * if (isRetryableError(error, ['ECONNRESET', 'fetch failed'])) {
 *   // Retry the operation
 * }
 * ```
 */
export function isRetryableError(
  error: unknown,
  retryableErrors: string[] = DEFAULT_OPTIONS.retryableErrors,
): boolean {
  if (!error) return false

  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''

  // Check error cause chain for nested error codes (e.g., EPIPE in error.cause.code)
  const errorCause = error && typeof error === 'object' && 'cause' in error ? error.cause : null
  const causeCode =
    errorCause && typeof errorCause === 'object' && 'code' in errorCause
      ? String(errorCause.code)
      : ''
  const causeMessage = errorCause instanceof Error ? errorCause.message : String(errorCause || '')

  return retryableErrors.some(
    retryable =>
      errorMessage.includes(retryable) ||
      errorCode.includes(retryable) ||
      causeCode.includes(retryable) || // Check cause.code (e.g., EPIPE)
      causeMessage.includes(retryable) || // Check cause.message
      (errorCause && isRetryableError(errorCause, retryableErrors)), // Recursive check
  )
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
): number {
  const delay = initialDelay * backoffMultiplier ** (attempt - 1)
  return Math.min(delay, maxDelay)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @param context - Context string for logging (e.g., function name)
 * @returns The result of the function
 * @throws The last error if all retries fail
 *
 * @example
 * ```typescript
 * const data = await withRetry(
 *   () => supabase.from('table').select(),
 *   { maxAttempts: 3 },
 *   'fetchData'
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  context: string = 'withRetry',
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        logger.queryWarn(context, 'Non-retryable error encountered', {
          error: error instanceof Error ? error.message : String(error),
          attempt,
        })
        throw error
      }

      // Don't retry if this was the last attempt
      if (attempt === opts.maxAttempts) {
        logger.queryWarn(context, 'All retry attempts exhausted', {
          error: error instanceof Error ? error.message : String(error),
          attempts: attempt,
        })
        break
      }

      // Calculate delay and wait before retrying
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier,
      )

      logger.queryWarn(context, 'Retrying after error', {
        error: error instanceof Error ? error.message : String(error),
        attempt,
        nextAttempt: attempt + 1,
        delayMs: delay,
      })

      await sleep(delay)
    }
  }

  // All retries failed, throw the last error
  throw lastError
}

/**
 * Retry specifically for Supabase queries with connection errors
 * Uses longer delays than default to handle transient network issues (ECONNRESET)
 * Aligned with middleware retry strategy for consistency
 *
 * @example
 * ```typescript
 * const data = await withSupabaseRetry(
 *   () => supabase.from('table').select(),
 *   'fetchTable'
 * )
 * ```
 */
export async function withSupabaseRetry<T>(
  fn: () => Promise<T>,
  context: string,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  return withRetry(
    fn,
    {
      maxAttempts: 3,
      initialDelay: 200,
      maxDelay: 1000,
      ...options,
    },
    context,
  )
}
