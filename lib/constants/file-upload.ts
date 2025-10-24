/**
 * File upload constants and configurations
 */

export const FILE_UPLOAD = {
  /** Maximum file size for CSV uploads (10MB) */
  MAX_FILE_SIZE: 10 * 1024 * 1024,

  /** Supported file extensions */
  SUPPORTED_EXTENSIONS: ['.csv'],

  /** MIME types for validation */
  SUPPORTED_MIME_TYPES: ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel'],
} as const

export const CSV_PROCESSING = {
  /** Default shelf life in days for products without expiry info */
  DEFAULT_SHELF_LIFE_DAYS: 30,

  /** Maximum days past expiry to accept items (items older than this are filtered out) */
  MAX_DAYS_PAST_EXPIRY: 7,

  /** Default category for products without category */
  DEFAULT_CATEGORY: 'dry_goods',

  /** Default location for inventory items */
  DEFAULT_LOCATION: 'MAIN',

  /** Default unit type */
  DEFAULT_UNIT_TYPE: 'units',
} as const

export const PRICE_CONSTRAINTS = {
  /** Minimum price for cost and selling prices (in currency units) */
  MIN_PRICE: 0.01,

  /** Maximum price for cost and selling prices (in currency units) */
  MAX_PRICE: 1000000,
} as const

export const TOAST_DURATIONS = {
  /** Duration for success messages (7 seconds) */
  SUCCESS: 7000,

  /** Duration for error messages (5 seconds) */
  ERROR: 5000,

  /** Duration for warning messages (4 seconds) */
  WARNING: 4000,
} as const

export const PERFORMANCE = {
  /** Timeout for health checks (5 seconds) */
  HEALTH_CHECK_TIMEOUT: 5000,

  /** Warning threshold for slow operations (3 seconds) */
  SLOW_OPERATION_WARNING_MS: 3000,

  /** Reset timeout for metrics (30 seconds) */
  METRICS_RESET_TIMEOUT: 30000,
} as const
