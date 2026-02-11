/**
 * Error Parser Utility
 * Transforms backend API errors into user-friendly messages
 */

export interface ParsedError {
  type: 'validation' | 'constraint' | 'network' | 'timeout' | 'auth' | 'server' | 'unknown'
  title: string
  message: string
  suggestion?: string
  technical?: string
  isRetryable: boolean
}

/**
 * Parse backend error response and extract meaningful information
 */
export function parseBackendError(error: unknown): ParsedError {
  // Default error structure
  const defaultError: ParsedError = {
    type: 'unknown',
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
    isRetryable: true,
  }

  if (!error) return defaultError

  const errorMessage = error instanceof Error ? error.message : String(error)

  // Parse Network/Timeout errors
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('AbortError') ||
    errorMessage.includes('ECONNREFUSED')
  ) {
    return {
      type: 'timeout',
      title: 'Connection Timeout',
      message: 'The request took too long to complete.',
      suggestion: 'Please check your internet connection and try again.',
      isRetryable: true,
    }
  }

  // Parse Authentication errors
  if (
    errorMessage.includes('Not authenticated') ||
    errorMessage.includes('Unauthorized') ||
    errorMessage.includes('401')
  ) {
    return {
      type: 'auth',
      title: 'Authentication Required',
      message: 'You need to sign in to perform this action.',
      suggestion: 'Please sign in and try again.',
      isRetryable: false,
    }
  }

  // Parse Database Constraint Violations
  if (
    errorMessage.includes('IntegrityError') ||
    errorMessage.includes('CheckViolationError') ||
    errorMessage.includes('check constraint')
  ) {
    return parseConstraintError(errorMessage)
  }

  // Parse Validation Errors
  if (errorMessage.includes('validation') || errorMessage.includes('422')) {
    return {
      type: 'validation',
      title: 'Invalid Data',
      message: 'The data provided does not meet the required format.',
      suggestion: 'Please check your input and try again.',
      technical: errorMessage,
      isRetryable: false,
    }
  }

  // Parse HTTP error codes from error message
  const httpMatch = errorMessage.match(/(\d{3})\s+/)
  if (httpMatch) {
    const statusCode = Number.parseInt(httpMatch[1], 10)
    return parseHttpError(statusCode, errorMessage)
  }

  // Generic server error
  if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
    return {
      type: 'server',
      title: 'Server Error',
      message: 'The server encountered an error while processing your request.',
      suggestion: 'Please try again in a few moments.',
      technical: errorMessage,
      isRetryable: true,
    }
  }

  // Return detailed error if available
  return {
    ...defaultError,
    technical: errorMessage,
  }
}

/**
 * Parse database constraint violation errors
 */
function parseConstraintError(errorMessage: string): ParsedError {
  // Check for specific constraint types
  if (errorMessage.includes('batches_initial_quantity_check')) {
    return {
      type: 'constraint',
      title: 'Invalid Inventory Quantity',
      message: 'Cannot sync inventory with zero or negative quantities.',
      suggestion:
        'This usually happens when Square has items with zero stock. Please update quantities in Square and try syncing again.',
      technical: errorMessage,
      isRetryable: false,
    }
  }

  if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key')) {
    // Check for Square catalog sync specific errors
    if (errorMessage.includes('products_sku_key') || errorMessage.includes('catalog sync')) {
      const skuMatch = errorMessage.match(/\(sku\)=\(([^)]+)\)/)
      const sku = skuMatch ? skuMatch[1] : 'unknown'

      return {
        type: 'constraint',
        title: 'Product Already Exists',
        message: `Product with SKU "${sku}" is already in your catalog.`,
        suggestion:
          'Try using "Force Full Sync" to update existing products, or check if the data is already synced.',
        technical: errorMessage,
        isRetryable: true, // Can retry with full sync
      }
    }

    return {
      type: 'constraint',
      title: 'Duplicate Entry',
      message: 'This record already exists in the system.',
      suggestion: 'Please refresh the page and check if the data was already saved.',
      technical: errorMessage,
      isRetryable: false,
    }
  }

  if (errorMessage.includes('foreign key constraint')) {
    return {
      type: 'constraint',
      title: 'Related Record Not Found',
      message: 'This action depends on data that does not exist.',
      suggestion: 'Please ensure all required data is created first.',
      technical: errorMessage,
      isRetryable: false,
    }
  }

  if (errorMessage.includes('not null constraint')) {
    return {
      type: 'constraint',
      title: 'Missing Required Data',
      message: 'Some required information is missing.',
      suggestion: 'Please fill in all required fields and try again.',
      technical: errorMessage,
      isRetryable: false,
    }
  }

  // Generic constraint error
  return {
    type: 'constraint',
    title: 'Data Constraint Violation',
    message: 'The data does not meet database requirements.',
    suggestion: 'Please verify your data and try again.',
    technical: errorMessage,
    isRetryable: false,
  }
}

/**
 * Parse HTTP status code errors
 */
function parseHttpError(statusCode: number, errorMessage: string): ParsedError {
  switch (statusCode) {
    case 400:
      return {
        type: 'validation',
        title: 'Bad Request',
        message: 'The request could not be understood by the server.',
        suggestion: 'Please check your input and try again.',
        technical: errorMessage,
        isRetryable: false,
      }

    case 401:
      return {
        type: 'auth',
        title: 'Unauthorized',
        message: 'You are not authorized to perform this action.',
        suggestion: 'Please sign in and try again.',
        technical: errorMessage,
        isRetryable: false,
      }

    case 403:
      return {
        type: 'auth',
        title: 'Access Denied',
        message: 'You do not have permission to perform this action.',
        suggestion: 'Please contact your administrator if you need access.',
        technical: errorMessage,
        isRetryable: false,
      }

    case 404:
      return {
        type: 'validation',
        title: 'Not Found',
        message: 'The requested resource could not be found.',
        suggestion: 'Please check the URL or resource identifier.',
        technical: errorMessage,
        isRetryable: false,
      }

    case 422:
      return {
        type: 'validation',
        title: 'Validation Error',
        message: 'The data provided is invalid or incomplete.',
        suggestion: 'Please check your input and try again.',
        technical: errorMessage,
        isRetryable: false,
      }

    case 429:
      return {
        type: 'validation',
        title: 'Too Many Requests',
        message: 'You have made too many requests in a short period.',
        suggestion: 'Please wait a moment and try again.',
        technical: errorMessage,
        isRetryable: true,
      }

    case 500:
      return {
        type: 'server',
        title: 'Server Error',
        message: 'The server encountered an unexpected error.',
        suggestion: 'Please try again in a few moments.',
        technical: errorMessage,
        isRetryable: true,
      }

    case 502:
    case 503:
    case 504:
      return {
        type: 'server',
        title: 'Service Unavailable',
        message: 'The service is temporarily unavailable.',
        suggestion: 'Please try again in a few moments.',
        technical: errorMessage,
        isRetryable: true,
      }

    default:
      return {
        type: 'unknown',
        title: `Error ${statusCode}`,
        message: 'An unexpected error occurred.',
        suggestion: 'Please try again or contact support if the problem persists.',
        technical: errorMessage,
        isRetryable: true,
      }
  }
}

/**
 * Extract specific error details from JSON error response
 */
export function parseJSONError(errorText: string): ParsedError {
  try {
    const errorData = JSON.parse(errorText)

    // Handle FastAPI HTTPException format
    if (errorData.detail) {
      return parseBackendError(new Error(errorData.detail))
    }

    // Handle structured error response
    if (errorData.error && errorData.error_code) {
      return parseBackendError(new Error(errorData.error))
    }

    // Fallback to parsing entire JSON as string
    return parseBackendError(new Error(JSON.stringify(errorData)))
  } catch {
    // Not valid JSON, parse as regular error
    return parseBackendError(new Error(errorText))
  }
}

/**
 * Format error for display in toast notifications
 */
export function formatErrorForToast(error: unknown): {
  title: string
  description: string
} {
  const parsed = parseBackendError(error)

  return {
    title: parsed.title,
    description: parsed.suggestion || parsed.message,
  }
}

/**
 * Format error for detailed error pages or dialogs
 */
export function formatErrorForDisplay(error: unknown): {
  title: string
  message: string
  suggestion?: string
  technical?: string
  canRetry: boolean
} {
  const parsed = parseBackendError(error)

  return {
    title: parsed.title,
    message: parsed.message,
    suggestion: parsed.suggestion,
    technical: process.env.NODE_ENV === 'development' ? parsed.technical : undefined,
    canRetry: parsed.isRetryable,
  }
}
