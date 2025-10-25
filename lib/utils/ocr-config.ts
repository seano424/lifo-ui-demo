/**
 * OCR configuration utilities
 * Provides safe environment variable parsing and configuration constants
 */

/**
 * Safely parse a float from an environment variable
 * Returns fallback value if parsing fails or produces NaN/Infinity
 */
export function parseEnvFloat(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) || !Number.isFinite(parsed) ? fallback : parsed
}

/**
 * Safely parse an integer from an environment variable
 * Returns fallback value if parsing fails or produces NaN
 */
export function parseEnvInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

/**
 * OCR default configuration constants
 * These values are used as fallbacks when environment variables are not set
 */
export const OCR_DEFAULTS = {
  // Frame analysis thresholds
  FRAME_ANALYSIS: {
    // Edge detection threshold - empirically determined for text detection
    // Values above this threshold are considered edges
    EDGE_THRESHOLD: 50,

    // Text edge percentage range - text typically has 2-25% edge pixels
    // Too few = no text, too many = noise/complex image
    MIN_EDGE_PERCENT: 2,
    MAX_EDGE_PERCENT: 25,

    // Barcode detection - minimum vertical lines needed to classify as barcode
    // Based on typical 1D barcode structure (15-50 vertical bars)
    MIN_BARCODE_LINES: 15,

    // Date pattern detection thresholds
    MAX_NUMBER_SHAPES: 15, // Max shapes before rejecting as text/logo (not a date)
    MIN_COMPONENT_PIXELS: 10, // Minimum pixels for a valid component (noise filter)
    MIN_NUMBER_WIDTH: 6, // Minimum width for number-like shapes
    MIN_NUMBER_HEIGHT: 10, // Minimum height for number-like shapes
    MAX_NUMBER_WIDTH: 45, // Maximum width for number-like shapes
    MAX_NUMBER_HEIGHT: 70, // Maximum height for number-like shapes
    MIN_NUMBER_ASPECT_RATIO: 1.3, // Minimum height/width ratio for numbers
    MAX_NUMBER_ASPECT_RATIO: 2.2, // Maximum height/width ratio for numbers
    MIN_SHAPE_PIXEL_COUNT: 80, // Minimum pixels per shape
    MAX_SHAPE_PIXEL_COUNT: 2400, // Maximum pixels per shape

    // Binary image threshold for text detection
    // Higher threshold (160 vs 128) helps capture light gray handwritten text
    BINARY_THRESHOLD: 160,

    // Horizontal line detection
    MIN_HORIZONTAL_LINES: 2, // Text typically has at least 2-3 horizontal patterns
    MIN_LINE_WIDTH_PERCENT: 0.1, // Line must be at least 10% of image width

    // Vertical line detection (for barcodes)
    VERTICAL_LINE_THRESHOLD: 100, // Gradient threshold for vertical edges
    MIN_LINE_HEIGHT_PERCENT: 0.3, // Line must be at least 30% of image height

    // Laplacian variance thresholds for sharpness
    // Typical variance for sharp images: 500-5000, blurry: 0-200
    MAX_LAPLACIAN_VARIANCE: 5000,
  },

  // Scanning behavior
  SCANNING: {
    PRE_CHECK_INTERVAL_MS: 500, // How often to analyze frames
    MAX_ATTEMPTS: 10, // Max OCR API calls before stopping
    MIN_TEXT_CONFIDENCE: 0.05, // Not a hard requirement - used in scoring only (30% weight)
    MIN_DATE_CONFIDENCE: 0.35, // HARD requirement - minimum date pattern detection confidence
    MIN_OVERALL_SCORE: 0.3, // HARD requirement - minimum combined score to trigger OCR
    MIN_SHARPNESS: 0.005, // HARD requirement - minimum sharpness/focus level
    OCR_CONFIDENCE_THRESHOLD: 0.5, // Default confidence threshold for OCR API
  },

  // Rate limiting
  RATE_LIMITING: {
    MAX_CONSECUTIVE_RATE_LIMITS: 3, // Stop scanning after 3 consecutive rate limits
    INITIAL_BACKOFF_SECONDS: 5, // Start with 5s backoff
    MAX_BACKOFF_SECONDS: 30, // Cap backoff at 30s
    BACKOFF_MULTIPLIER: 2, // Exponential backoff multiplier
  },

  // Image quality thresholds
  IMAGE_QUALITY: {
    MIN_BRIGHTNESS: 0.2, // Below this = too dark
    MAX_BRIGHTNESS: 0.9, // Above this = overexposed
    MIN_CONTRAST: 0.0, // Minimum contrast (unused currently)
    MIN_SHARPNESS: 0.01, // Minimum sharpness for text detection
  },

  // Scoring weights
  SCORING_WEIGHTS: {
    TEXT_CONFIDENCE: 0.3, // 30% weight on text detection
    DATE_PATTERN: 0.4, // 40% weight on date pattern detection
    SHARPNESS: 0.15, // 15% weight on sharpness
    CONTRAST: 0.15, // 15% weight on contrast
  },

  // Flood fill safety limits
  FLOOD_FILL: {
    MAX_ITERATIONS: 10000, // Prevent infinite loops on large connected regions
  },
} as const

/**
 * Get OCR configuration from environment variables with safe fallbacks
 */
export function getOCRConfig() {
  return {
    minTextConfidence: parseEnvFloat(
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_TEXT_CONFIDENCE,
      OCR_DEFAULTS.SCANNING.MIN_TEXT_CONFIDENCE,
    ),
    minDateConfidence: parseEnvFloat(
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_DATE_CONFIDENCE,
      OCR_DEFAULTS.SCANNING.MIN_DATE_CONFIDENCE,
    ),
    minOverallScore: parseEnvFloat(
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_OVERALL_SCORE,
      OCR_DEFAULTS.SCANNING.MIN_OVERALL_SCORE,
    ),
    minSharpness: parseEnvFloat(
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_SHARPNESS,
      OCR_DEFAULTS.SCANNING.MIN_SHARPNESS,
    ),
  }
}
