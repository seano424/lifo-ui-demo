/**
 * Client-side frame analysis for OCR pre-checks
 * Analyzes video frames to determine if they likely contain text/dates
 * before making expensive OCR API calls
 */

import { ocrDebugLogger } from './ocr-debug-logger'

export interface FrameAnalysis {
  // Text detection
  hasTextLikeContent: boolean
  textConfidence: number // 0-1 score

  // Date-specific detection
  hasDatePattern: boolean
  datePatternConfidence: number

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
    minTextConfidence = 0.3,
    minDateConfidence = 0.4,
    minOverallScore = 0.5,
    minSharpness = 0.15,
  } = options

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    ocrDebugLogger.log('FRAME_ANALYZER_ERROR', {
      error: 'Failed to get canvas context',
    })
    return createEmptyAnalysis()
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // Run all detections
  const textDetection = detectTextLikeContent(imageData)
  const barcodeDetection = detectBarcode(imageData)
  const dateDetection = detectDatePattern(imageData, barcodeDetection.isBarcode)
  const quality = analyzeImageQuality(imageData)

  // Calculate overall score (weighted combination)
  const overallScore =
    textDetection.confidence * 0.3 + // 30% weight on text
    dateDetection.confidence * 0.4 + // 40% weight on date patterns
    quality.sharpness * 0.15 + // 15% weight on sharpness
    quality.contrast * 0.15 // 15% weight on contrast

  // Determine if we should trigger OCR
  // IMPORTANT: Skip OCR if barcode is detected (wrong scanner mode!)
  const shouldTriggerOCR =
    !barcodeDetection.isBarcode && // No barcode detected
    textDetection.hasText &&
    textDetection.confidence >= minTextConfidence &&
    dateDetection.confidence >= minDateConfidence &&
    overallScore >= minOverallScore &&
    quality.brightness > 0.2 && // Not too dark
    quality.brightness < 0.9 && // Not overexposed
    quality.sharpness > minSharpness // Reasonably sharp (configurable)

  const analysis: FrameAnalysis = {
    hasTextLikeContent: textDetection.hasText,
    textConfidence: textDetection.confidence,
    hasDatePattern: dateDetection.hasDatePattern,
    datePatternConfidence: dateDetection.confidence,
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
  const threshold = 50
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

  // Text typically has 3-15% edge pixels
  // Too few = no text, too many = noise/complex image
  // For dates: Allow relaxed detection even without horizontal patterns (handwritten dates)
  const hasText =
    edgePercentage >= 3 && edgePercentage <= 25 && (horizontalPatterns || edgePercentage >= 8)

  // Normalize confidence to 0-1 range
  // Optimal range is around 5-10% edge pixels
  let confidence = 0
  if (edgePercentage >= 3 && edgePercentage <= 15) {
    confidence = Math.min((edgePercentage - 3) / 12, 1)
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
  const isBarcode = verticalLines >= 15

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
 * Now with barcode filtering - if barcode detected, reduce date confidence
 */
function detectDatePattern(
  imageData: ImageData,
  isBarcodeDetected: boolean,
): {
  hasDatePattern: boolean
  confidence: number
  debugInfo?: {
    numberLikeShapes: number
    hasSeparators: boolean
  }
} {
  // Convert to binary (black and white only)
  const binary = toBinaryImage(imageData, 128)

  // Find connected components (groups of pixels that form shapes)
  const components = findConnectedComponents(binary, imageData.width, imageData.height)

  // Filter for number-like shapes
  // Numbers are typically taller than wide (aspect ratio ~1.3-2.0)
  // And not too small (min 5x8 pixels)
  const numberLikeShapes = components.filter(c => {
    const ratio = c.height / c.width
    const isNumberSized = c.width >= 5 && c.height >= 8 && c.width <= 50 && c.height <= 80
    const isNumberRatio = ratio >= 1.2 && ratio <= 2.2
    return isNumberSized && isNumberRatio
  })

  // Look for separator patterns (slashes, dashes, dots)
  const hasSeparators = detectSeparatorPatterns(binary, imageData.width, imageData.height)

  // Date needs at least 4 number-like characters (e.g., "12/25" = 4 digits)
  // Ideally 6-8 for full dates (e.g., "12/25/2025" = 8 digits)
  const hasDatePattern = numberLikeShapes.length >= 4 && hasSeparators

  // Calculate confidence based on number of number-like shapes and separators
  let confidence = 0
  if (numberLikeShapes.length >= 4) {
    // More number-like shapes = higher confidence (up to 8 for full date)
    confidence = Math.min(numberLikeShapes.length / 8, 1) * 0.7
  }
  if (hasSeparators) {
    confidence += 0.3 // Boost for separators
  }

  // IMPORTANT: If barcode detected, severely reduce date confidence
  // Barcode digits at bottom are NOT expiry dates!
  if (isBarcodeDetected) {
    confidence *= 0.1 // Reduce to 10% if barcode detected
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

  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    const idx = y * width + x

    if (x < 0 || x >= width || y < 0 || y >= height) continue
    if (visited[idx] === 1 || binary[idx] === 0) continue

    visited[idx] = 1
    pixelCount++

    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)

    // Add neighbors
    stack.push([x + 1, y])
    stack.push([x - 1, y])
    stack.push([x, y + 1])
    stack.push([x, y - 1])
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
    isBarcodeDetected: false,
    barcodeConfidence: 0,
    brightness: 0,
    contrast: 0,
    sharpness: 0,
    overallScore: 0,
    shouldTriggerOCR: false,
  }
}
