const isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG === 'true'
const isQueryLoggingEnabled = process.env.NEXT_PUBLIC_LOG_QUERIES === 'true'

export const logger = {
  // Regular log - now also controlled by query logging flag for cleaner console
  // Only shows when NEXT_PUBLIC_LOG_QUERIES=true OR NEXT_PUBLIC_DEBUG=true
  log: (context: string, message: string, ...args: unknown[]) => {
    if (isQueryLoggingEnabled || isDebugEnabled) {
      console.log(`[${context}] ${message}`, ...args)
    }
  },
  // Errors always show - these are critical and should never be hidden
  error: (context: string, message: string, ...args: unknown[]) => {
    console.error(`[${context}] ${message}`, ...args)
  },
  // Warnings controlled by query logging or debug flag
  warn: (context: string, message: string, ...args: unknown[]) => {
    if (isQueryLoggingEnabled || isDebugEnabled) {
      console.warn(`[${context}] ${message}`, ...args)
    }
  },
  // Query/performance logging - can be controlled separately for less noise
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
