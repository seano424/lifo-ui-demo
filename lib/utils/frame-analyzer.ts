/**
 * Client-side frame analysis for OCR pre-checks
 * Analyzes video frames to determine if they likely contain text/dates
 * before making expensive OCR API calls
 */

import { logger } from './logger'
import { OCR_DEFAULTS, parseEnvFloat } from './ocr-config'
import { ocrDebugLogger } from './ocr-debug-logger'

export interface FrameAnalysis {
  // Text detection
  hasTextLikeContent: boolean
  textConfidence: number // 0-1 score

  // Date-specific detection
  hasDatePattern: boolean
  datePatternConfidence: number
  hasDateContext: boolean // New: detects date-related keywords

  // Barcode detection
  isBarcodeDetected: boolean
  barcodeConfidence: number

  // Image quality metrics
  brightness: number // 0-1 (0=dark, 1=bright)
  contrast: number // 0-1
  sharpness: number // 0-1 (blur detection)

  // Overall assessment
  overallScore: number // 0-1, combined metric
  shouldTriggerOCR: boolean

  // Debug info
  debugInfo?: {
    edgePixelCount: number
    totalPixels: number
    edgePercentage: number
    numberLikeShapes: number
    hasSeparators: boolean
    dateContextDetected: boolean // New: date keyword detection
    horizontalPatterns: boolean
    verticalLineCount: number
    hasVerticalPattern: boolean
  }
}

interface ConnectedComponent {
  width: number
  height: number
  x: number
  y: number
  pixelCount: number
}

/**
 * Main entry point: Analyze a canvas frame for text and date patterns
 */
export function analyzeFrame(
  canvas: HTMLCanvasElement,
  options: {
    debug?: boolean
    minTextConfidence?: number
    minDateConfidence?: number
    minOverallScore?: number
    minSharpness?: number
  } = {},
): FrameAnalysis {
  const {
    debug = false,
    // minTextConfidence is kept for API compatibility but no longer used as a hard threshold
    // It still contributes to overall score calculation (30% weight) via textDetection.confidence
    minTextConfidence: _minTextConfidence = parseEnvFloat(
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_TEXT_CONFIDENCE,
      OCR_DEFAULTS.SCANNING.MIN_TEXT_CONFIDENCE,
    ),
    minDateConfidence = parseEnvFloat(
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_DATE_CONFIDENCE,
      OCR_DEFAULTS.SCANNING.MIN_DATE_CONFIDENCE,
    ),
    minOverallScore = parseEnvFloat(
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_OVERALL_SCORE,
      OCR_DEFAULTS.SCANNING.MIN_OVERALL_SCORE,
    ),
    minSharpness = parseEnvFloat(
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_SHARPNESS,
      OCR_DEFAULTS.SCANNING.MIN_SHARPNESS,
    ),
  } = options

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    ocrDebugLogger.log('FRAME_ANALYZER_ERROR', {
      error: 'Failed to get canvas context',
    })
    return createEmptyAnalysis()
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // Convert to binary for date context detection
  const binary = toBinaryImage(imageData, OCR_DEFAULTS.FRAME_ANALYSIS.BINARY_THRESHOLD)

  // Run all detections
  const textDetection = detectTextLikeContent(imageData)
  const barcodeDetection = detectBarcode(imageData)
  const dateContextDetection = detectDateContextKeywords(binary, imageData)
  const dateDetection = detectDatePattern(
    imageData,
    barcodeDetection.isBarcode,
    dateContextDetection,
  )
  const quality = analyzeImageQuality(imageData)

  // Calculate overall score (weighted combination)
  // Date context boosts overall score when detected
  const dateContextBoost = dateContextDetection.hasDateContext ? 0.1 : 0
  const overallScore =
    textDetection.confidence * 0.25 + // 25% weight on text
    dateDetection.confidence * 0.4 + // 40% weight on date patterns
    quality.sharpness * 0.15 + // 15% weight on sharpness
    quality.contrast * 0.1 + // 10% weight on contrast
    dateContextDetection.confidence * 0.1 + // 10% weight on date context
    dateContextBoost // Bonus when date context detected

  // Determine if we should trigger OCR
  // IMPORTANT: Skip OCR if barcode is detected (wrong scanner mode!)
  // NOTE: Text confidence is NOT a hard requirement - it's already factored into overallScore (30% weight)
  // If date pattern confidence is high, that's sufficient signal to trigger OCR
  const shouldTriggerOCR =
    !barcodeDetection.isBarcode && // No barcode detected
    dateDetection.confidence >= minDateConfidence && // Strong date pattern signal
    overallScore >= minOverallScore && // Overall quality check (includes text confidence)
    quality.brightness > 0.2 && // Not too dark
    quality.brightness < 0.9 && // Not overexposed
    quality.sharpness >= minSharpness // Reasonably sharp (configurable, >= not >)

  const analysis: FrameAnalysis = {
    hasTextLikeContent: textDetection.hasText,
    textConfidence: textDetection.confidence,
    hasDatePattern: dateDetection.hasDatePattern,
    datePatternConfidence: dateDetection.confidence,
    hasDateContext: dateContextDetection.hasDateContext,
    isBarcodeDetected: barcodeDetection.isBarcode,
    barcodeConfidence: barcodeDetection.confidence,
    brightness: quality.brightness,
    contrast: quality.contrast,
    sharpness: quality.sharpness,
    overallScore,
    shouldTriggerOCR,
  }

  if (debug) {
    analysis.debugInfo = {
      edgePixelCount: textDetection.debugInfo?.edgePixelCount || 0,
      totalPixels: imageData.width * imageData.height,
      edgePercentage: textDetection.debugInfo?.edgePercentage || 0,
      numberLikeShapes: dateDetection.debugInfo?.numberLikeShapes || 0,
      hasSeparators: dateDetection.debugInfo?.hasSeparators || false,
      dateContextDetected: dateContextDetection.hasDateContext,
      horizontalPatterns: textDetection.debugInfo?.horizontalPatterns || false,
      verticalLineCount: barcodeDetection.debugInfo?.verticalLineCount || 0,
      hasVerticalPattern: barcodeDetection.debugInfo?.hasVerticalPattern || false,
    }

    ocrDebugLogger.log('FRAME_ANALYZER_COMPLETE', {
      shouldTriggerOCR: analysis.shouldTriggerOCR,
      textConfidence: analysis.textConfidence,
      datePatternConfidence: analysis.datePatternConfidence,
      overallScore: analysis.overallScore,
      debugInfo: analysis.debugInfo,
    })
  }

  return analysis
}

/**
 * Detect text-like content using edge detection and pattern analysis
 */
function detectTextLikeContent(imageData: ImageData): {
  hasText: boolean
  confidence: number
  debugInfo?: {
    edgePixelCount: number
    edgePercentage: number
    horizontalPatterns: boolean
  }
} {
  // Convert to grayscale
  const grayscale = toGrayscale(imageData)

  // Apply Sobel edge detection
  const edges = sobelEdgeDetection(grayscale, imageData.width, imageData.height)

  // Count edge pixels
  // Edge threshold empirically determined for text detection
  const threshold = OCR_DEFAULTS.FRAME_ANALYSIS.EDGE_THRESHOLD
  let edgePixelCount = 0
  for (let i = 0; i < edges.length; i++) {
    if (edges[i] > threshold) {
      edgePixelCount++
    }
  }

  const totalPixels = imageData.width * imageData.height
  const edgePercentage = (edgePixelCount / totalPixels) * 100

  // Detect horizontal patterns (text typically appears in lines)
  const horizontalPatterns = detectHorizontalLines(edges, imageData.width, imageData.height)

  // Text typically has 2-25% edge pixels
  // Too few = no text, too many = noise/complex image
  // For dates: Allow relaxed detection for handwritten text on paper (low contrast)
  // Lowered threshold from 3% to 2% to support handwritten dates on white paper
  const hasText =
    edgePercentage >= OCR_DEFAULTS.FRAME_ANALYSIS.MIN_EDGE_PERCENT &&
    edgePercentage <= OCR_DEFAULTS.FRAME_ANALYSIS.MAX_EDGE_PERCENT &&
    (horizontalPatterns || edgePercentage >= 2.5)

  // Normalize confidence to 0-1 range
  // Optimal range is around 5-10% edge pixels
  let confidence = 0
  if (edgePercentage >= 2 && edgePercentage <= 15) {
    confidence = Math.min((edgePercentage - 2) / 13, 1)
  } else if (edgePercentage > 15 && edgePercentage <= 25) {
    // Decay confidence for very high edge counts
    confidence = Math.max(0, 1 - (edgePercentage - 15) / 10)
  }

  // Boost confidence if horizontal patterns detected
  if (horizontalPatterns) {
    confidence = Math.min(confidence * 1.3, 1)
  }

  return {
    hasText,
    confidence,
    debugInfo: {
      edgePixelCount,
      edgePercentage,
      horizontalPatterns,
    },
  }
}

/**
 * Detect barcode patterns in the image
 * Barcodes have strong vertical line patterns with regular spacing
 */
function detectBarcode(imageData: ImageData): {
  isBarcode: boolean
  confidence: number
  debugInfo?: {
    verticalLineCount: number
    hasVerticalPattern: boolean
  }
} {
  // Convert to grayscale
  const grayscale = toGrayscale(imageData)

  // Detect vertical lines (barcode bars)
  const verticalLines = detectVerticalLines(grayscale, imageData.width, imageData.height)

  // Barcodes typically have many vertical lines (at least 15-20 bars)
  // Based on typical 1D barcode structure
  const isBarcode = verticalLines >= OCR_DEFAULTS.FRAME_ANALYSIS.MIN_BARCODE_LINES

  // Calculate confidence based on vertical line count
  // More vertical lines = higher barcode confidence
  const confidence = Math.min(verticalLines / 30, 1)

  return {
    isBarcode,
    confidence,
    debugInfo: {
      verticalLineCount: verticalLines,
      hasVerticalPattern: verticalLines >= 15,
    },
  }
}

/**
 * Detect date-like patterns in the image
 * Now with barcode filtering and date context boosting
 */
function detectDatePattern(
  imageData: ImageData,
  isBarcodeDetected: boolean,
  dateContextDetection: { hasDateContext: boolean; confidence: number },
): {
  hasDatePattern: boolean
  confidence: number
  debugInfo?: {
    numberLikeShapes: number
    hasSeparators: boolean
  }
} {
  // Convert to binary (black and white only)
  // Use adaptive threshold: for handwritten text on white paper, use higher threshold (160)
  // This helps capture light gray text that would be missed with threshold 128
  const binary = toBinaryImage(imageData, OCR_DEFAULTS.FRAME_ANALYSIS.BINARY_THRESHOLD)

  // Find connected components (groups of pixels that form shapes)
  const components = findConnectedComponents(binary, imageData.width, imageData.height)

  // Filter for number-like shapes
  // Numbers are typically taller than wide (aspect ratio ~1.3-2.2)
  // Relaxed for handwritten dates which may have varied proportions
  // IMPORTANT: Balance between catching handwritten dates and avoiding logos
  const numberLikeShapes = components.filter(c => {
    const ratio = c.height / c.width
    // Relaxed size constraints for handwritten text (smaller minimum)
    const isNumberSized =
      c.width >= OCR_DEFAULTS.FRAME_ANALYSIS.MIN_NUMBER_WIDTH &&
      c.height >= OCR_DEFAULTS.FRAME_ANALYSIS.MIN_NUMBER_HEIGHT &&
      c.width <= OCR_DEFAULTS.FRAME_ANALYSIS.MAX_NUMBER_WIDTH &&
      c.height <= OCR_DEFAULTS.FRAME_ANALYSIS.MAX_NUMBER_HEIGHT
    // Relaxed aspect ratio: 1.3-2.2 to catch handwritten numbers
    const isNumberRatio =
      ratio >= OCR_DEFAULTS.FRAME_ANALYSIS.MIN_NUMBER_ASPECT_RATIO &&
      ratio <= OCR_DEFAULTS.FRAME_ANALYSIS.MAX_NUMBER_ASPECT_RATIO
    // Reject very small or very large components (likely noise or logos)
    const isSaneSize =
      c.pixelCount >= OCR_DEFAULTS.FRAME_ANALYSIS.MIN_SHAPE_PIXEL_COUNT &&
      c.pixelCount <= OCR_DEFAULTS.FRAME_ANALYSIS.MAX_SHAPE_PIXEL_COUNT
    return isNumberSized && isNumberRatio && isSaneSize
  })

  // Look for separator patterns (slashes, dashes, dots)
  const hasSeparators = detectSeparatorPatterns(binary, imageData.width, imageData.height)

  // Simplified approach: Don't require minimum shapes, just reject massive text blocks
  // IMPORTANT: Reject if TOO MANY shapes detected (>15 = likely text/logo, not date)
  // This allows handwritten dates (1-10 shapes) while still blocking HAWAII (20-30 shapes)
  const hasDatePattern = numberLikeShapes.length <= OCR_DEFAULTS.FRAME_ANALYSIS.MAX_NUMBER_SHAPES

  // Calculate confidence based on text presence and separators
  // Let the OCR API do the heavy lifting of validating the actual date
  // VERSION_MARKER: v2.4_simplified_no_min_shapes
  let confidence = 0

  if (numberLikeShapes.length > 0 && numberLikeShapes.length <= 15) {
    // Base confidence from having some text-like shapes
    const shapeScore = Math.min(numberLikeShapes.length / 10, 1) * 0.5

    if (hasSeparators) {
      // WITH separators: Higher confidence (likely a date format)
      confidence = Math.min(shapeScore + 0.5, 1.0)
    } else {
      // WITHOUT separators: Lower confidence but still allowed
      confidence = shapeScore * 0.7
    }
  }
  // If > 15 shapes: confidence stays 0 (too many = text/logo, not a date)

  // Debug logging via logger utility
  if (numberLikeShapes.length > 0) {
    logger.log('FrameAnalyzer', 'Date pattern detection', {
      shapes: numberLikeShapes.length,
      hasSeparators,
      confidence: confidence.toFixed(3),
      rejected: numberLikeShapes.length > 15 ? 'TOO_MANY_SHAPES' : null,
      version: 'v2.4',
    })
  }

  // IMPORTANT: If barcode detected, severely reduce date confidence
  // Barcode digits at bottom are NOT expiry dates!
  if (isBarcodeDetected) {
    confidence *= 0.1 // Reduce to 10% if barcode detected
  }

  // BOOST: If date context keywords detected (EXP, BBD, etc.), boost confidence
  // This helps catch dates that might be missed due to poor quality
  if (dateContextDetection.hasDateContext && confidence > 0) {
    // Boost by 20-40% depending on date context confidence
    const boost = dateContextDetection.confidence * 0.4
    confidence = Math.min(confidence + boost, 1.0)

    logger.log('FrameAnalyzer', 'Date context boost applied', {
      originalConfidence: (confidence - boost).toFixed(3),
      boost: boost.toFixed(3),
      finalConfidence: confidence.toFixed(3),
    })
  }

  return {
    hasDatePattern: hasDatePattern && !isBarcodeDetected, // No date pattern if barcode
    confidence: Math.min(confidence, 1),
    debugInfo: {
      numberLikeShapes: numberLikeShapes.length,
      hasSeparators,
    },
  }
}

/**
 * Analyze image quality (brightness, contrast, sharpness)
 */
function analyzeImageQuality(imageData: ImageData): {
  brightness: number
  contrast: number
  sharpness: number
} {
  const { data, width, height } = imageData

  // Calculate brightness (average pixel intensity)
  let totalBrightness = 0
  for (let i = 0; i < data.length; i += 4) {
    // Convert RGB to perceived brightness
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    totalBrightness += brightness
  }
  const avgBrightness = totalBrightness / (data.length / 4)

  // Calculate contrast (standard deviation of brightness)
  let varianceSum = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    const diff = brightness - avgBrightness
    varianceSum += diff * diff
  }
  const stdDev = Math.sqrt(varianceSum / (data.length / 4))
  const contrast = Math.min(stdDev * 4, 1) // Normalize to 0-1

  // Calculate sharpness using Laplacian variance (blur detection)
  const grayscale = toGrayscale(imageData)
  const sharpness = calculateLaplacianVariance(grayscale, width, height)

  return {
    brightness: avgBrightness,
    contrast,
    sharpness,
  }
}

// ============================================================================
// Helper Functions - Image Processing Primitives
// ============================================================================

/**
 * Convert RGB image to grayscale
 */
function toGrayscale(imageData: ImageData): Uint8ClampedArray {
  const { data, width, height } = imageData
  const grayscale = new Uint8ClampedArray(width * height)

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    // Standard grayscale conversion
    grayscale[i / 4] = Math.floor(0.299 * r + 0.587 * g + 0.114 * b)
  }

  return grayscale
}

/**
 * Sobel edge detection - OPTIMIZED
 * Sample every 2 pixels for 4x speed improvement
 */
function sobelEdgeDetection(
  grayscale: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const edges = new Uint8ClampedArray(width * height)

  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

  // OPTIMIZATION: Process every 2 pixels for speed (still accurate for text detection)
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      let gx = 0
      let gy = 0

      // Apply kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx)
          const kernelIdx = (ky + 1) * 3 + (kx + 1)
          gx += grayscale[idx] * sobelX[kernelIdx]
          gy += grayscale[idx] * sobelY[kernelIdx]
        }
      }

      // Calculate gradient magnitude (use faster approximation)
      const magnitude = Math.abs(gx) + Math.abs(gy) // Manhattan distance (faster than sqrt)
      edges[y * width + x] = Math.min(magnitude, 255)
    }
  }

  return edges
}

/**
 * Detect horizontal line patterns in edge image
 */
function detectHorizontalLines(edges: Uint8ClampedArray, width: number, height: number): boolean {
  const threshold = 50
  const minLineLength = Math.floor(width * 0.1) // Line must be at least 10% of image width

  let horizontalLinesFound = 0

  // Scan horizontal lines
  for (let y = 0; y < height; y += 5) {
    // Check every 5th row for performance
    let consecutiveEdges = 0

    for (let x = 0; x < width; x++) {
      if (edges[y * width + x] > threshold) {
        consecutiveEdges++
      } else {
        if (consecutiveEdges >= minLineLength) {
          horizontalLinesFound++
        }
        consecutiveEdges = 0
      }
    }

    if (consecutiveEdges >= minLineLength) {
      horizontalLinesFound++
    }
  }

  // Text typically has at least 2-3 horizontal patterns
  return horizontalLinesFound >= 2
}

/**
 * Detect vertical line patterns (for barcode detection)
 */
function detectVerticalLines(grayscale: Uint8ClampedArray, width: number, height: number): number {
  const threshold = 100 // Higher threshold for strong vertical edges
  const minLineHeight = Math.floor(height * 0.3) // Line must be at least 30% of image height

  let verticalLinesFound = 0

  // Scan vertical columns
  for (let x = 0; x < width; x += 2) {
    // Check every 2nd column for performance
    let consecutiveEdges = 0

    for (let y = 1; y < height - 1; y++) {
      // Calculate vertical gradient (simplified edge detection)
      const top = grayscale[(y - 1) * width + x]
      const bottom = grayscale[(y + 1) * width + x]
      const gradient = Math.abs(bottom - top)

      if (gradient > threshold) {
        consecutiveEdges++
      } else {
        if (consecutiveEdges >= minLineHeight) {
          verticalLinesFound++
        }
        consecutiveEdges = 0
      }
    }

    if (consecutiveEdges >= minLineHeight) {
      verticalLinesFound++
    }
  }

  return verticalLinesFound
}

/**
 * Convert image to binary (black and white)
 */
function toBinaryImage(imageData: ImageData, threshold: number): Uint8ClampedArray {
  const grayscale = toGrayscale(imageData)
  const binary = new Uint8ClampedArray(grayscale.length)

  for (let i = 0; i < grayscale.length; i++) {
    binary[i] = grayscale[i] > threshold ? 255 : 0
  }

  return binary
}

/**
 * Find connected components (blob detection) - OPTIMIZED
 * Sample every other pixel for speed
 */
function findConnectedComponents(
  binary: Uint8ClampedArray,
  width: number,
  height: number,
): ConnectedComponent[] {
  const visited = new Uint8ClampedArray(width * height)
  const components: ConnectedComponent[] = []

  // Flood fill to find connected white regions
  // OPTIMIZATION: Sample every other pixel (2x speed improvement)
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const idx = y * width + x

      if (binary[idx] === 255 && visited[idx] === 0) {
        const component = floodFill(binary, visited, x, y, width, height)
        if (component.pixelCount > 10) {
          // Ignore tiny components (noise)
          components.push(component)
        }
      }
    }
  }

  return components
}

/**
 * Flood fill algorithm to trace connected region
 * Uses iterative approach with safety limits to prevent memory issues
 */
function floodFill(
  binary: Uint8ClampedArray,
  visited: Uint8ClampedArray,
  startX: number,
  startY: number,
  width: number,
  height: number,
): ConnectedComponent {
  const stack: Array<[number, number]> = [[startX, startY]]
  let minX = startX
  let maxX = startX
  let minY = startY
  let maxY = startY
  let pixelCount = 0
  let iterations = 0

  // Safety limit to prevent infinite loops on large connected regions
  const MAX_ITERATIONS = OCR_DEFAULTS.FLOOD_FILL.MAX_ITERATIONS

  while (stack.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++

    // Safe pop with null check
    const coords = stack.pop()
    if (!coords) break

    const [x, y] = coords
    const idx = y * width + x

    // Boundary and validity checks
    if (x < 0 || x >= width || y < 0 || y >= height) continue
    if (visited[idx] === 1 || binary[idx] === 0) continue

    visited[idx] = 1
    pixelCount++

    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)

    // Add neighbors (4-connectivity)
    stack.push([x + 1, y])
    stack.push([x - 1, y])
    stack.push([x, y + 1])
    stack.push([x, y - 1])
  }

  // Log warning if we hit iteration limit
  if (iterations >= MAX_ITERATIONS) {
    logger.warn('FrameAnalyzer', 'Flood fill hit max iterations', {
      iterations,
      pixelCount,
      maxIterations: MAX_ITERATIONS,
    })
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    pixelCount,
  }
}

/**
 * Detect separator patterns (/, -, ., :)
 */
function detectSeparatorPatterns(
  binary: Uint8ClampedArray,
  width: number,
  height: number,
): boolean {
  // Look for thin vertical or diagonal lines (separators)
  // Separators are typically 1-3 pixels wide and 10-30 pixels tall

  const components = findConnectedComponents(binary, width, height)

  const separatorLike = components.filter(c => {
    const isVerticalLine = c.width <= 3 && c.height >= 10 && c.height <= 50
    const isDiagonalLine = c.width <= 5 && c.height >= 10 && c.height <= 50
    return isVerticalLine || isDiagonalLine
  })

  // Need at least 1 separator for a date (e.g., "12/25")
  return separatorLike.length >= 1
}

/**
 * Detect date-related context keywords (EXP, BBD, Best Before, etc.)
 * This helps boost confidence when date-related text is detected near numbers
 * Supports multiple European languages
 */
function detectDateContextKeywords(
  binary: Uint8ClampedArray,
  imageData: ImageData,
): {
  hasDateContext: boolean
  confidence: number
} {
  const { width, height } = imageData

  // Find connected components (potential letters/words)
  const components = findConnectedComponents(binary, width, height)

  // Look for patterns that might indicate date keywords
  // Date keywords are typically:
  // - Wider than tall (letters like E, X, P are wider than numbers)
  // - Clustered horizontally (words)
  // - Medium sized (not tiny noise, not huge logos)

  // Filter for letter-like shapes (wider than tall, unlike numbers)
  const letterLikeShapes = components.filter(c => {
    const ratio = c.width / c.height
    const isLetterSized =
      c.width >= 5 &&
      c.height >= 8 &&
      c.width <= 100 &&
      c.height <= 60
    const isLetterRatio = ratio >= 0.4 && ratio <= 2.5 // Letters can be wide (M, W) or tall (I, l)
    const isSaneSize = c.pixelCount >= 30 && c.pixelCount <= 3000
    return isLetterSized && isLetterRatio && isSaneSize
  })

  if (letterLikeShapes.length === 0) {
    return { hasDateContext: false, confidence: 0 }
  }

  // Look for horizontal clusters of letters (words)
  // Date keywords like "EXP", "BBD", "BEST BEFORE" appear as horizontal clusters
  let horizontalClusters = 0
  let dateKeywordPatterns = 0

  for (let i = 0; i < letterLikeShapes.length; i++) {
    const shape1 = letterLikeShapes[i]

    // Look for nearby shapes on the same horizontal line
    const nearbyShapes = letterLikeShapes.filter((shape2, j) => {
      if (i === j) return false

      // Check if shapes are on similar Y position (same line)
      const yDiff = Math.abs(shape1.y - shape2.y)
      const avgHeight = (shape1.height + shape2.height) / 2
      const onSameLine = yDiff < avgHeight * 0.5

      // Check if shapes are horizontally close
      const xDist = Math.abs(shape1.x - shape2.x)
      const isNearby = xDist < width * 0.2 // Within 20% of image width

      return onSameLine && isNearby
    })

    if (nearbyShapes.length >= 2) {
      horizontalClusters++

      // Check if this cluster might be a date keyword
      // EXP: 3 shapes (E, X, P)
      // BBD: 3 shapes (B, B, D)
      // Common pattern: 2-6 letters in a row
      if (nearbyShapes.length >= 1 && nearbyShapes.length <= 5) {
        dateKeywordPatterns++
      }
    }
  }

  // Detect specific patterns that indicate date context
  // Look for:
  // 1. Small clusters of wide shapes (EXP, BBD)
  // 2. Longer words near numbers (BEST BEFORE, USE BY)
  const hasDateContext = horizontalClusters >= 1 || dateKeywordPatterns >= 1

  // Calculate confidence based on patterns found
  let confidence = 0
  if (dateKeywordPatterns > 0) {
    // Strong signal: specific patterns detected
    confidence = Math.min(dateKeywordPatterns * 0.4 + 0.2, 1.0)
  } else if (horizontalClusters > 0) {
    // Moderate signal: horizontal text clusters (might be date context)
    confidence = Math.min(horizontalClusters * 0.3, 0.6)
  }

  return {
    hasDateContext,
    confidence,
  }
}

/**
 * Calculate Laplacian variance (blur detection)
 * Higher variance = sharper image
 */
function calculateLaplacianVariance(
  grayscale: Uint8ClampedArray,
  width: number,
  height: number,
): number {
  // Laplacian kernel
  const kernel = [0, 1, 0, 1, -4, 1, 0, 1, 0]

  let sum = 0
  let count = 0

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let laplacian = 0

      // Apply kernel
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx)
          const kernelIdx = (ky + 1) * 3 + (kx + 1)
          laplacian += grayscale[idx] * kernel[kernelIdx]
        }
      }

      sum += laplacian * laplacian
      count++
    }
  }

  const variance = sum / count

  // Normalize to 0-1 range
  // Typical variance for sharp images: 500-5000
  // Blurry images: 0-200
  return Math.min(variance / 5000, 1)
}

/**
 * Create empty analysis result (fallback)
 */
function createEmptyAnalysis(): FrameAnalysis {
  return {
    hasTextLikeContent: false,
    textConfidence: 0,
    hasDatePattern: false,
    datePatternConfidence: 0,
    hasDateContext: false,
    isBarcodeDetected: false,
    barcodeConfidence: 0,
    brightness: 0,
    contrast: 0,
    sharpness: 0,
    overallScore: 0,
    shouldTriggerOCR: false,
  }
}
