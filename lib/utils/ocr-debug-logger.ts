/**
 * Comprehensive OCR debug logging utility
 * Controlled by NEXT_PUBLIC_DEBUG_OCR environment variable
 */

const IS_OCR_DEBUG_ENABLED =
  process.env.NEXT_PUBLIC_DEBUG_OCR === 'true' || process.env.NODE_ENV === 'development'

export interface OCRDebugEvent {
  timestamp: string
  event: string
  data: Record<string, unknown>
  duration?: number
}

class OCRDebugLogger {
  private events: OCRDebugEvent[] = []
  private apiCallCount = 0
  private apiCallSuccesses = 0
  private apiCallFailures = 0
  private totalProcessingTime = 0
  private sessionStartTime = Date.now()

  /**
   * Log a debug event
   */
  log(event: string, data: Record<string, unknown> = {}, duration?: number) {
    if (!IS_OCR_DEBUG_ENABLED) return

    const debugEvent: OCRDebugEvent = {
      timestamp: new Date().toISOString(),
      event,
      data,
      duration,
    }

    this.events.push(debugEvent)

    // Console log with styling
    const style = 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;'
    console.log(
      `%c[OCR DEBUG] ${event}`,
      style,
      {
        ...data,
        ...(duration ? { duration: `${duration}ms` } : {}),
      },
    )
  }

  /**
   * Log an API call
   */
  logAPICall(endpoint: string, method: string, data: Record<string, unknown> = {}) {
    this.apiCallCount++
    this.log('API_CALL', {
      endpoint,
      method,
      totalCalls: this.apiCallCount,
      ...data,
    })
  }

  /**
   * Log API success
   */
  logAPISuccess(endpoint: string, responseData: Record<string, unknown>, duration: number) {
    this.apiCallSuccesses++
    this.totalProcessingTime += duration
    this.log(
      'API_SUCCESS',
      {
        endpoint,
        successRate: `${((this.apiCallSuccesses / this.apiCallCount) * 100).toFixed(1)}%`,
        avgProcessingTime: `${(this.totalProcessingTime / this.apiCallSuccesses).toFixed(0)}ms`,
        ...responseData,
      },
      duration,
    )
  }

  /**
   * Log API failure
   */
  logAPIFailure(endpoint: string, error: unknown, duration?: number) {
    this.apiCallFailures++
    this.log(
      'API_FAILURE',
      {
        endpoint,
        error: error instanceof Error ? error.message : String(error),
        failureRate: `${((this.apiCallFailures / this.apiCallCount) * 100).toFixed(1)}%`,
      },
      duration,
    )
  }

  /**
   * Log frame analysis
   */
  logFrameAnalysis(result: {
    shouldTriggerOCR: boolean
    textConfidence: number
    datePatternConfidence: number
    overallScore: number
    reason?: string
  }) {
    this.log('FRAME_ANALYSIS', result)
  }

  /**
   * Log OCR trigger decision
   */
  logOCRTrigger(triggered: boolean, reason: string, analysis: Record<string, unknown>) {
    this.log('OCR_TRIGGER_DECISION', {
      triggered,
      reason,
      analysis,
    })
  }

  /**
   * Log auto-scan lifecycle event
   */
  logLifecycle(
    event: 'START' | 'STOP' | 'RESET' | 'MAX_ATTEMPTS' | 'RATE_LIMIT_PAUSE',
    data: Record<string, unknown> = {},
  ) {
    this.log(`LIFECYCLE_${event}`, data)
  }

  /**
   * Get statistics
   */
  getStats() {
    const sessionDuration = Date.now() - this.sessionStartTime
    return {
      sessionDuration: `${(sessionDuration / 1000).toFixed(1)}s`,
      totalEvents: this.events.length,
      apiCalls: {
        total: this.apiCallCount,
        successes: this.apiCallSuccesses,
        failures: this.apiCallFailures,
        successRate: `${this.apiCallCount > 0 ? ((this.apiCallSuccesses / this.apiCallCount) * 100).toFixed(1) : 0}%`,
      },
      performance: {
        avgAPIResponseTime:
          this.apiCallSuccesses > 0
            ? `${(this.totalProcessingTime / this.apiCallSuccesses).toFixed(0)}ms`
            : 'N/A',
        totalProcessingTime: `${(this.totalProcessingTime / 1000).toFixed(1)}s`,
      },
    }
  }

  /**
   * Print statistics summary
   */
  printStats() {
    if (!IS_OCR_DEBUG_ENABLED) return

    const stats = this.getStats()
    console.group('%c[OCR DEBUG] Session Statistics', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px; font-weight: bold;')
    console.log('Session Duration:', stats.sessionDuration)
    console.log('Total Events:', stats.totalEvents)
    console.group('API Calls')
    console.log('Total:', stats.apiCalls.total)
    console.log('Successes:', stats.apiCalls.successes)
    console.log('Failures:', stats.apiCalls.failures)
    console.log('Success Rate:', stats.apiCalls.successRate)
    console.groupEnd()
    console.group('Performance')
    console.log('Avg Response Time:', stats.performance.avgAPIResponseTime)
    console.log('Total Processing:', stats.performance.totalProcessingTime)
    console.groupEnd()
    console.groupEnd()
  }

  /**
   * Export events for debugging
   */
  exportEvents(): OCRDebugEvent[] {
    return [...this.events]
  }

  /**
   * Clear all events
   */
  clear() {
    this.events = []
    this.apiCallCount = 0
    this.apiCallSuccesses = 0
    this.apiCallFailures = 0
    this.totalProcessingTime = 0
    this.sessionStartTime = Date.now()
  }

  /**
   * Check if debug is enabled
   */
  isEnabled(): boolean {
    return IS_OCR_DEBUG_ENABLED
  }
}

// Singleton instance
export const ocrDebugLogger = new OCRDebugLogger()

// Make available on window for debugging
if (typeof window !== 'undefined' && IS_OCR_DEBUG_ENABLED) {
  ;(window as unknown as { ocrDebug: OCRDebugLogger }).ocrDebug = ocrDebugLogger
  console.log(
    '%c[OCR DEBUG] Debug mode enabled. Use window.ocrDebug.printStats() to see statistics.',
    'background: #FF9800; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;',
  )
}
