const isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG === 'true'
const isQueryLoggingEnabled = process.env.NEXT_PUBLIC_LOG_QUERIES === 'true'

/**
 * Logger interface for type-safe logging throughout the application
 */
export interface Logger {
  log: (context: string, message: string, ...args: unknown[]) => void
  error: (context: string, message: string, ...args: unknown[]) => void
  warn: (context: string, message: string, ...args: unknown[]) => void
  query: (context: string, message: string, ...args: unknown[]) => void
  queryWarn: (context: string, message: string, ...args: unknown[]) => void
}

/**
 * Application logger with environment-controlled output
 *
 * Log Levels:
 * - log(): General app flow (auth, lifecycle) - controlled by NEXT_PUBLIC_DEBUG
 * - warn(): General warnings - controlled by NEXT_PUBLIC_DEBUG
 * - error(): Critical errors - ALWAYS displayed
 * - query(): Query/performance logs - controlled by NEXT_PUBLIC_LOG_QUERIES
 * - queryWarn(): Query/performance warnings - controlled by NEXT_PUBLIC_LOG_QUERIES
 */
export const logger: Logger = {
  // Regular log - for general app flow (auth events, lifecycle, etc.)
  // Only shows when NEXT_PUBLIC_DEBUG=true
  log: (context: string, message: string, ...args: unknown[]) => {
    if (isDebugEnabled) {
      console.log(`[${context}] ${message}`, ...args)
    }
  },
  // Errors always show - these are critical and should never be hidden
  error: (context: string, message: string, ...args: unknown[]) => {
    console.error(`[${context}] ${message}`, ...args)
  },
  // Warnings for general app issues - controlled by debug flag
  warn: (context: string, message: string, ...args: unknown[]) => {
    if (isDebugEnabled) {
      console.warn(`[${context}] ${message}`, ...args)
    }
  },
  // Query/performance logging - controlled separately to reduce noise
  // Only shows when NEXT_PUBLIC_LOG_QUERIES=true
  query: (context: string, message: string, ...args: unknown[]) => {
    if (isQueryLoggingEnabled) {
      console.log(`[${context}] ${message}`, ...args)
    }
  },
  queryWarn: (context: string, message: string, ...args: unknown[]) => {
    if (isQueryLoggingEnabled) {
      console.warn(`[${context}] ${message}`, ...args)
    }
  },
}
