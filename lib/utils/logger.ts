const isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG === 'true'
const isQueryLoggingEnabled = process.env.NEXT_PUBLIC_LOG_QUERIES === 'true'
const isOCRDebugEnabled = process.env.NEXT_PUBLIC_DEBUG_OCR === 'true'

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
 * OCR-specific contexts that will use the NEXT_PUBLIC_DEBUG_OCR flag
 */
const OCR_CONTEXTS = [
  'OCRClient',
  'useOCRWithFallback',
  'StandaloneScanningInterface',
  'ScanningCamera',
]

/**
 * Check if a context should use OCR debugging
 */
function isOCRContext(context: string): boolean {
  return OCR_CONTEXTS.some(ocrContext => context.includes(ocrContext))
}

/**
 * Application logger with environment-controlled output
 *
 * Log Levels:
 * - log(): General app flow (auth, lifecycle) - controlled by NEXT_PUBLIC_DEBUG or NEXT_PUBLIC_DEBUG_OCR for OCR contexts
 * - warn(): General warnings - controlled by NEXT_PUBLIC_DEBUG or NEXT_PUBLIC_DEBUG_OCR for OCR contexts
 * - error(): Critical errors - ALWAYS displayed
 * - query(): Query/performance logs - controlled by NEXT_PUBLIC_LOG_QUERIES
 * - queryWarn(): Query/performance warnings - controlled by NEXT_PUBLIC_LOG_QUERIES
 *
 * Environment Variables:
 * - NEXT_PUBLIC_DEBUG: Enable all debug logs
 * - NEXT_PUBLIC_DEBUG_OCR: Enable OCR-specific debug logs only
 * - NEXT_PUBLIC_LOG_QUERIES: Enable database query and API performance logs
 */
export const logger: Logger = {
  // Regular log - for general app flow (auth events, lifecycle, etc.)
  // Shows when NEXT_PUBLIC_DEBUG=true OR (NEXT_PUBLIC_DEBUG_OCR=true and context is OCR-related)
  log: (context: string, message: string, ...args: unknown[]) => {
    if (isDebugEnabled || (isOCRDebugEnabled && isOCRContext(context))) {
      console.log(`[${context}] ${message}`, ...args)
    }
  },
  // Errors always show - these are critical and should never be hidden
  error: (context: string, message: string, ...args: unknown[]) => {
    console.error(`[${context}] ${message}`, ...args)
  },
  // Warnings for general app issues - controlled by debug flag
  // Shows when NEXT_PUBLIC_DEBUG=true OR (NEXT_PUBLIC_DEBUG_OCR=true and context is OCR-related)
  warn: (context: string, message: string, ...args: unknown[]) => {
    if (isDebugEnabled || (isOCRDebugEnabled && isOCRContext(context))) {
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
