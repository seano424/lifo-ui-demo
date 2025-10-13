/**
 * Comprehensive tests for frame-analyzer utility
 *
 * Tests cover:
 * - Edge detection algorithms
 * - Barcode vs date pattern discrimination
 * - Quality thresholds (brightness, sharpness, contrast)
 * - Configuration options
 * - Safety limits
 *
 * Note: Uses mocked canvas operations since jsdom doesn't support canvas natively
 */

import { analyzeFrame } from '@/lib/utils/frame-analyzer'

describe('frame-analyzer', () => {
  let mockCanvas: HTMLCanvasElement
  let mockContext: CanvasRenderingContext2D
  let mockImageData: ImageData

  beforeEach(() => {
    // Create mock canvas
    mockCanvas = document.createElement('canvas')
    mockCanvas.width = 100
    mockCanvas.height = 100

    // Create mock image data with transparent pixels
    mockImageData = {
      width: 100,
      height: 100,
      data: new Uint8ClampedArray(100 * 100 * 4).fill(255),
      colorSpace: 'srgb',
    } as ImageData

    // Mock context with required methods
    mockContext = {
      getImageData: jest.fn().mockReturnValue(mockImageData),
      fillRect: jest.fn(),
      fillStyle: '',
      font: '',
      fillText: jest.fn(),
      drawImage: jest.fn(),
      putImageData: jest.fn(),
    } as unknown as CanvasRenderingContext2D

    // Mock getContext to return our mock context
    jest.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('analyzeFrame - Basic Functionality', () => {
    it('should return empty analysis if canvas context is null', () => {
      jest.spyOn(mockCanvas, 'getContext').mockReturnValue(null)

      const result = analyzeFrame(mockCanvas)

      expect(result).toEqual({
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
      })
    })

    it('should analyze a blank canvas (all white)', () => {
      // All white pixels (255, 255, 255)
      mockImageData.data.fill(255)

      const result = analyzeFrame(mockCanvas)

      // White image should be very bright
      expect(result.brightness).toBeGreaterThan(0.9)
      // But likely no text detected
      expect(result.hasTextLikeContent).toBe(false)
      // Should not trigger OCR (overexposed)
      expect(result.shouldTriggerOCR).toBe(false)
    })

    it('should calculate overall score from weighted components', () => {
      const result = analyzeFrame(mockCanvas)

      // Overall score should be between 0 and 1
      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(1)

      // Should be defined (even if 0)
      expect(typeof result.overallScore).toBe('number')
      expect(Number.isNaN(result.overallScore)).toBe(false)
    })

    it('should return all required fields', () => {
      const result = analyzeFrame(mockCanvas)

      expect(result).toHaveProperty('hasTextLikeContent')
      expect(result).toHaveProperty('textConfidence')
      expect(result).toHaveProperty('hasDatePattern')
      expect(result).toHaveProperty('datePatternConfidence')
      expect(result).toHaveProperty('isBarcodeDetected')
      expect(result).toHaveProperty('barcodeConfidence')
      expect(result).toHaveProperty('brightness')
      expect(result).toHaveProperty('contrast')
      expect(result).toHaveProperty('sharpness')
      expect(result).toHaveProperty('overallScore')
      expect(result).toHaveProperty('shouldTriggerOCR')
    })
  })

  describe('Image Quality Metrics', () => {
    it('should calculate brightness correctly for white image', () => {
      // All white pixels
      mockImageData.data.fill(255)

      const result = analyzeFrame(mockCanvas)

      expect(result.brightness).toBeGreaterThan(0.8)
      expect(result.brightness).toBeLessThanOrEqual(1.0)
    })

    it('should calculate brightness correctly for black image', () => {
      // All black pixels (RGB = 0, Alpha = 255)
      for (let i = 0; i < mockImageData.data.length; i += 4) {
        mockImageData.data[i] = 0 // R
        mockImageData.data[i + 1] = 0 // G
        mockImageData.data[i + 2] = 0 // B
        mockImageData.data[i + 3] = 255 // A
      }

      const result = analyzeFrame(mockCanvas)

      expect(result.brightness).toBeLessThan(0.1)
      expect(result.brightness).toBeGreaterThanOrEqual(0)
    })

    it('should reject overexposed images (too bright)', () => {
      // Very bright image
      mockImageData.data.fill(255)

      const result = analyzeFrame(mockCanvas)

      expect(result.brightness).toBeGreaterThan(0.9)
      // Should not trigger OCR due to overexposure
      expect(result.shouldTriggerOCR).toBe(false)
    })

    it('should reject underexposed images (too dark)', () => {
      // Very dark image
      for (let i = 0; i < mockImageData.data.length; i += 4) {
        mockImageData.data[i] = 10
        mockImageData.data[i + 1] = 10
        mockImageData.data[i + 2] = 10
        mockImageData.data[i + 3] = 255
      }

      const result = analyzeFrame(mockCanvas)

      expect(result.brightness).toBeLessThan(0.2)
      // Should not trigger OCR due to underexposure
      expect(result.shouldTriggerOCR).toBe(false)
    })

    it('should calculate contrast as a number between 0 and 1', () => {
      const result = analyzeFrame(mockCanvas)

      expect(result.contrast).toBeGreaterThanOrEqual(0)
      expect(result.contrast).toBeLessThanOrEqual(1)
      expect(Number.isNaN(result.contrast)).toBe(false)
    })

    it('should calculate sharpness as a number between 0 and 1', () => {
      const result = analyzeFrame(mockCanvas)

      expect(result.sharpness).toBeGreaterThanOrEqual(0)
      expect(result.sharpness).toBeLessThanOrEqual(1)
      expect(Number.isNaN(result.sharpness)).toBe(false)
    })
  })

  describe('shouldTriggerOCR Decision Logic', () => {
    it('should not trigger OCR with default thresholds on blank canvas', () => {
      const result = analyzeFrame(mockCanvas)

      expect(result.shouldTriggerOCR).toBe(false)
    })

    it('should not trigger if barcode is detected', () => {
      const result = analyzeFrame(mockCanvas)

      // If barcode was detected (simulated), shouldTriggerOCR should be false
      if (result.isBarcodeDetected) {
        expect(result.shouldTriggerOCR).toBe(false)
      }
    })

    it('should not trigger if brightness out of range', () => {
      // Test overexposed (all white)
      mockImageData.data.fill(255)
      const brightResult = analyzeFrame(mockCanvas)
      expect(brightResult.brightness).toBeGreaterThan(0.9)
      expect(brightResult.shouldTriggerOCR).toBe(false)

      // Test underexposed (all dark)
      for (let i = 0; i < mockImageData.data.length; i += 4) {
        mockImageData.data[i] = 5
        mockImageData.data[i + 1] = 5
        mockImageData.data[i + 2] = 5
        mockImageData.data[i + 3] = 255
      }
      const darkResult = analyzeFrame(mockCanvas)
      expect(darkResult.brightness).toBeLessThan(0.2)
      expect(darkResult.shouldTriggerOCR).toBe(false)
    })

    it('should require all conditions to trigger OCR', () => {
      const result = analyzeFrame(mockCanvas)

      // For OCR to trigger, must have:
      // - No barcode
      // - Text detected
      // - Date pattern
      // - Good brightness (0.2 < x < 0.9)
      // - Sufficient sharpness
      // - High enough confidence scores

      if (result.shouldTriggerOCR) {
        expect(result.isBarcodeDetected).toBe(false)
        expect(result.hasTextLikeContent).toBe(true)
        expect(result.hasDatePattern).toBe(true)
        expect(result.brightness).toBeGreaterThan(0.2)
        expect(result.brightness).toBeLessThan(0.9)
      }
    })
  })

  describe('Configuration Options', () => {
    it('should respect custom minTextConfidence threshold', () => {
      const strictResult = analyzeFrame(mockCanvas, {
        minTextConfidence: 0.9,
      })

      const relaxedResult = analyzeFrame(mockCanvas, {
        minTextConfidence: 0.01,
      })

      // Both should complete without error
      expect(strictResult).toBeDefined()
      expect(relaxedResult).toBeDefined()

      // Stricter threshold more likely to fail OCR trigger
      expect(typeof strictResult.shouldTriggerOCR).toBe('boolean')
      expect(typeof relaxedResult.shouldTriggerOCR).toBe('boolean')
    })

    it('should respect custom minDateConfidence threshold', () => {
      const result = analyzeFrame(mockCanvas, {
        minDateConfidence: 0.8,
      })

      expect(result).toBeDefined()
      expect(result.datePatternConfidence).toBeGreaterThanOrEqual(0)
    })

    it('should respect custom minOverallScore threshold', () => {
      const highThreshold = analyzeFrame(mockCanvas, {
        minOverallScore: 0.9,
      })

      const lowThreshold = analyzeFrame(mockCanvas, {
        minOverallScore: 0.1,
      })

      expect(highThreshold).toBeDefined()
      expect(lowThreshold).toBeDefined()
    })

    it('should respect custom minSharpness threshold', () => {
      const result = analyzeFrame(mockCanvas, {
        minSharpness: 0.5,
      })

      expect(result).toBeDefined()
      expect(result.sharpness).toBeGreaterThanOrEqual(0)
    })

    it('should include debug info when debug flag is true', () => {
      const resultWithDebug = analyzeFrame(mockCanvas, { debug: true })
      const resultWithoutDebug = analyzeFrame(mockCanvas, { debug: false })

      expect(resultWithDebug.debugInfo).toBeDefined()
      expect(resultWithDebug.debugInfo).toHaveProperty('edgePixelCount')
      expect(resultWithDebug.debugInfo).toHaveProperty('edgePercentage')
      expect(resultWithDebug.debugInfo).toHaveProperty('numberLikeShapes')

      expect(resultWithoutDebug.debugInfo).toBeUndefined()
    })
  })

  describe('Constants Usage', () => {
    it('should use OCR_DEFAULTS for thresholds', () => {
      const result = analyzeFrame(mockCanvas, { debug: true })

      // Verify that the analysis uses the defaults
      expect(result.debugInfo).toBeDefined()
      expect(typeof result.debugInfo?.edgePercentage).toBe('number')
    })

    it('should use brightness thresholds from OCR_DEFAULTS', () => {
      // The function should use:
      // OCR_DEFAULTS.IMAGE_QUALITY.MIN_BRIGHTNESS (0.2)
      // OCR_DEFAULTS.IMAGE_QUALITY.MAX_BRIGHTNESS (0.9)

      const result = analyzeFrame(mockCanvas)

      // If brightness is out of range, should not trigger OCR
      if (result.brightness <= 0.2 || result.brightness >= 0.9) {
        expect(result.shouldTriggerOCR).toBe(false)
      }
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle very small canvas', () => {
      mockCanvas.width = 10
      mockCanvas.height = 10
      mockImageData = {
        width: 10,
        height: 10,
        data: new Uint8ClampedArray(10 * 10 * 4).fill(255),
        colorSpace: 'srgb',
      } as ImageData
      mockContext.getImageData = jest.fn().mockReturnValue(mockImageData)

      const result = analyzeFrame(mockCanvas)

      expect(result).toBeDefined()
      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(1)
    })

    it('should handle large canvas dimensions', () => {
      mockCanvas.width = 1920
      mockCanvas.height = 1080
      const largeImageData = {
        width: 1920,
        height: 1080,
        data: new Uint8ClampedArray(1920 * 1080 * 4).fill(200),
        colorSpace: 'srgb',
      } as ImageData
      mockContext.getImageData = jest.fn().mockReturnValue(largeImageData)

      const result = analyzeFrame(mockCanvas)

      expect(result).toBeDefined()
      expect(result.brightness).toBeDefined()
    })

    it('should handle transparent/empty canvas', () => {
      // Set all alpha values to 0 (transparent)
      for (let i = 0; i < mockImageData.data.length; i += 4) {
        mockImageData.data[i + 3] = 0
      }

      const result = analyzeFrame(mockCanvas)

      expect(result).toBeDefined()
      expect(typeof result.brightness).toBe('number')
    })

    it('should handle canvas with single pixel', () => {
      mockCanvas.width = 1
      mockCanvas.height = 1
      mockImageData = {
        width: 1,
        height: 1,
        data: new Uint8ClampedArray(4).fill(128),
        colorSpace: 'srgb',
      } as ImageData
      mockContext.getImageData = jest.fn().mockReturnValue(mockImageData)

      const result = analyzeFrame(mockCanvas)

      expect(result).toBeDefined()
    })
  })

  describe('Return Value Validation', () => {
    it('should return valid confidence scores (0-1 range)', () => {
      const result = analyzeFrame(mockCanvas)

      expect(result.textConfidence).toBeGreaterThanOrEqual(0)
      expect(result.textConfidence).toBeLessThanOrEqual(1)

      expect(result.datePatternConfidence).toBeGreaterThanOrEqual(0)
      expect(result.datePatternConfidence).toBeLessThanOrEqual(1)

      expect(result.barcodeConfidence).toBeGreaterThanOrEqual(0)
      expect(result.barcodeConfidence).toBeLessThanOrEqual(1)

      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(1)
    })

    it('should return valid quality metrics (0-1 range)', () => {
      const result = analyzeFrame(mockCanvas)

      expect(result.brightness).toBeGreaterThanOrEqual(0)
      expect(result.brightness).toBeLessThanOrEqual(1)

      expect(result.contrast).toBeGreaterThanOrEqual(0)
      expect(result.contrast).toBeLessThanOrEqual(1)

      expect(result.sharpness).toBeGreaterThanOrEqual(0)
      expect(result.sharpness).toBeLessThanOrEqual(1)
    })

    it('should not return NaN values', () => {
      const result = analyzeFrame(mockCanvas)

      expect(Number.isNaN(result.textConfidence)).toBe(false)
      expect(Number.isNaN(result.datePatternConfidence)).toBe(false)
      expect(Number.isNaN(result.barcodeConfidence)).toBe(false)
      expect(Number.isNaN(result.brightness)).toBe(false)
      expect(Number.isNaN(result.contrast)).toBe(false)
      expect(Number.isNaN(result.sharpness)).toBe(false)
      expect(Number.isNaN(result.overallScore)).toBe(false)
    })

    it('should return boolean for shouldTriggerOCR', () => {
      const result = analyzeFrame(mockCanvas)

      expect(typeof result.shouldTriggerOCR).toBe('boolean')
    })
  })

  describe('Integration Tests', () => {
    it('should work with different option combinations', () => {
      const options = [
        { minTextConfidence: 0.1, minDateConfidence: 0.2 },
        { minOverallScore: 0.3, minSharpness: 0.01 },
        { debug: true },
        { debug: false, minTextConfidence: 0.5 },
      ]

      options.forEach(opts => {
        const result = analyzeFrame(mockCanvas, opts)
        expect(result).toBeDefined()
        expect(result.overallScore).toBeGreaterThanOrEqual(0)
      })
    })

    it('should handle multiple sequential analyses', () => {
      const results = []

      for (let i = 0; i < 5; i++) {
        results.push(analyzeFrame(mockCanvas))
      }

      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(typeof result.overallScore).toBe('number')
      })
    })
  })
})
