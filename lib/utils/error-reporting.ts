/**
 * Error reporting utility for production applications
 */

export interface ErrorReportOptions {
  context?: Record<string, unknown>
  userId?: string
  storeName?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Report an error to the appropriate service
 * In development, logs to console
 * In production, this would integrate with services like Sentry, LogRocket, etc.
 */
export function reportError(error: Error | string, options: ErrorReportOptions = {}): void {
  const errorMessage = error instanceof Error ? error.message : error
  const errorStack = error instanceof Error ? error.stack : undefined

  const errorReport = {
    message: errorMessage,
    stack: errorStack,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    ...options,
  }

  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error Report [${options.severity || 'medium'}]`)
    console.error('Message:', errorMessage)
    if (errorStack) {
      console.error('Stack:', errorStack)
    }
    if (options.context) {
      console.error('Context:', options.context)
    }
    console.groupEnd()
  } else {
    // In production, integrate with error reporting service
    // Example integrations:
    // - Sentry.captureException(error, { extra: options })
    // - LogRocket.captureException(error)
    // - Custom API endpoint for error logging

    // For now, we'll send to a hypothetical error endpoint
    if (typeof fetch !== 'undefined') {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport),
      }).catch(() => {
        // Silently fail - don't create error loops
      })
    }
  }
}

/**
 * Wrapper function for async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorContext: ErrorReportOptions = {},
): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    reportError(error instanceof Error ? error : new Error(String(error)), {
      ...errorContext,
      severity: 'high',
    })
    return null
  }
}
