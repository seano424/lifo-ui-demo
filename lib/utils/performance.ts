/**
 * Performance monitoring utility
 *
 * Tracks response times for database operations and API calls
 * with mobile performance target of <300ms
 */

import { logger } from './logger'

export type PerformanceThreshold = {
  warn: number // Warn if operation takes longer than this (ms)
  error: number // Error if operation takes longer than this (ms)
}

export const DEFAULT_THRESHOLDS: PerformanceThreshold = {
  warn: 500,
  error: 2000,
}

export class PerformanceTimer {
  private startTime: number
  private context: string
  private operation: string
  private metadata: Record<string, unknown>
  private thresholds: PerformanceThreshold

  constructor(
    context: string,
    operation: string,
    metadata: Record<string, unknown> = {},
    thresholds: PerformanceThreshold = DEFAULT_THRESHOLDS,
  ) {
    this.context = context
    this.operation = operation
    this.metadata = metadata
    this.thresholds = thresholds
    this.startTime = performance.now()

    logger.query(context, `Starting: ${operation}`, metadata)
  }

  /**
   * End the timer and log performance metrics
   */
  end(additionalMetadata: Record<string, unknown> = {}): number {
    const duration = performance.now() - this.startTime
    const allMetadata = {
      ...this.metadata,
      ...additionalMetadata,
      duration: `${duration.toFixed(2)}ms`,
    }

    if (duration > this.thresholds.error) {
      logger.queryWarn(
        this.context,
        `SLOW (>${this.thresholds.error}ms): ${this.operation}`,
        allMetadata,
      )
    } else if (duration > this.thresholds.warn) {
      logger.queryWarn(
        this.context,
        `Slow (>${this.thresholds.warn}ms): ${this.operation}`,
        allMetadata,
      )
    } else {
      logger.query(this.context, `Completed: ${this.operation}`, allMetadata)
    }

    return duration
  }
}

/**
 * Convenience function to wrap an async operation with performance monitoring
 *
 * @example
 * const users = await withPerformanceTracking(
 *   'fetchStoreUsers',
 *   'Fetch store users',
 *   { storeId },
 *   () => supabase.rpc('get_store_users', { input_store_id: storeId })
 * )
 */
export async function withPerformanceTracking<T>(
  context: string,
  operation: string,
  metadata: Record<string, unknown>,
  fn: () => Promise<T>,
  thresholds?: PerformanceThreshold,
): Promise<T> {
  const timer = new PerformanceTimer(context, operation, metadata, thresholds)

  try {
    const result = await fn()
    timer.end({ success: true })
    return result
  } catch (error) {
    timer.end({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
