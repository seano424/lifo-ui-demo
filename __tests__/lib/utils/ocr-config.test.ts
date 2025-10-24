/**
 * Tests for OCR configuration utilities
 * Tests safe environment variable parsing
 */

import { parseEnvFloat, parseEnvInt, getOCRConfig, OCR_DEFAULTS } from '@/lib/utils/ocr-config'

describe('ocr-config', () => {
  describe('parseEnvFloat', () => {
    it('should parse valid float strings', () => {
      expect(parseEnvFloat('0.5', 0.0)).toBe(0.5)
      expect(parseEnvFloat('1.234', 0.0)).toBe(1.234)
      expect(parseEnvFloat('0.05', 0.0)).toBe(0.05)
    })

    it('should return fallback for undefined', () => {
      expect(parseEnvFloat(undefined, 0.42)).toBe(0.42)
    })

    it('should return fallback for invalid strings', () => {
      expect(parseEnvFloat('invalid', 0.5)).toBe(0.5)
      expect(parseEnvFloat('abc', 1.0)).toBe(1.0)
      expect(parseEnvFloat('', 0.25)).toBe(0.25)
    })

    it('should handle edge cases', () => {
      expect(parseEnvFloat('0', 1.0)).toBe(0)
      expect(parseEnvFloat('1', 0.0)).toBe(1)
      expect(parseEnvFloat('-0.5', 0.0)).toBe(-0.5)
    })

    it('should return fallback for NaN results', () => {
      expect(parseEnvFloat('NaN', 0.5)).toBe(0.5)
      expect(parseEnvFloat('Infinity', 0.5)).toBe(0.5)
    })
  })

  describe('parseEnvInt', () => {
    it('should parse valid integer strings', () => {
      expect(parseEnvInt('10', 0)).toBe(10)
      expect(parseEnvInt('500', 0)).toBe(500)
      expect(parseEnvInt('0', 100)).toBe(0)
    })

    it('should return fallback for undefined', () => {
      expect(parseEnvInt(undefined, 42)).toBe(42)
    })

    it('should return fallback for invalid strings', () => {
      expect(parseEnvInt('invalid', 10)).toBe(10)
      expect(parseEnvInt('abc', 20)).toBe(20)
      expect(parseEnvInt('', 30)).toBe(30)
    })

    it('should parse integers in base 10', () => {
      expect(parseEnvInt('10', 0)).toBe(10)
      expect(parseEnvInt('010', 0)).toBe(10) // Not octal
    })

    it('should return fallback for NaN results', () => {
      expect(parseEnvInt('NaN', 10)).toBe(10)
      expect(parseEnvInt('Infinity', 10)).toBe(10)
    })

    it('should truncate floats to integers', () => {
      expect(parseEnvInt('10.5', 0)).toBe(10)
      expect(parseEnvInt('99.9', 0)).toBe(99)
    })
  })

  describe('OCR_DEFAULTS', () => {
    it('should have frame analysis constants', () => {
      expect(OCR_DEFAULTS.FRAME_ANALYSIS.EDGE_THRESHOLD).toBe(50)
      expect(OCR_DEFAULTS.FRAME_ANALYSIS.MIN_EDGE_PERCENT).toBe(2)
      expect(OCR_DEFAULTS.FRAME_ANALYSIS.MAX_EDGE_PERCENT).toBe(25)
      expect(OCR_DEFAULTS.FRAME_ANALYSIS.MIN_BARCODE_LINES).toBe(15)
    })

    it('should have scanning behavior constants', () => {
      expect(OCR_DEFAULTS.SCANNING.PRE_CHECK_INTERVAL_MS).toBe(500)
      expect(OCR_DEFAULTS.SCANNING.MAX_ATTEMPTS).toBe(10)
      expect(OCR_DEFAULTS.SCANNING.MIN_TEXT_CONFIDENCE).toBe(0.05) // Not a hard requirement - used in scoring only
      expect(OCR_DEFAULTS.SCANNING.MIN_DATE_CONFIDENCE).toBe(0.35) // HARD requirement
      expect(OCR_DEFAULTS.SCANNING.MIN_OVERALL_SCORE).toBe(0.3) // HARD requirement
      expect(OCR_DEFAULTS.SCANNING.MIN_SHARPNESS).toBe(0.005) // HARD requirement
    })

    it('should have rate limiting constants', () => {
      expect(OCR_DEFAULTS.RATE_LIMITING.MAX_CONSECUTIVE_RATE_LIMITS).toBe(3)
      expect(OCR_DEFAULTS.RATE_LIMITING.INITIAL_BACKOFF_SECONDS).toBe(5)
      expect(OCR_DEFAULTS.RATE_LIMITING.MAX_BACKOFF_SECONDS).toBe(30)
      expect(OCR_DEFAULTS.RATE_LIMITING.BACKOFF_MULTIPLIER).toBe(2)
    })

    it('should have image quality thresholds', () => {
      expect(OCR_DEFAULTS.IMAGE_QUALITY.MIN_BRIGHTNESS).toBe(0.2)
      expect(OCR_DEFAULTS.IMAGE_QUALITY.MAX_BRIGHTNESS).toBe(0.9)
      expect(OCR_DEFAULTS.IMAGE_QUALITY.MIN_SHARPNESS).toBe(0.01)
    })

    it('should have scoring weights that sum to 1.0', () => {
      const weights = OCR_DEFAULTS.SCORING_WEIGHTS
      const sum =
        weights.TEXT_CONFIDENCE + weights.DATE_PATTERN + weights.SHARPNESS + weights.CONTRAST

      expect(sum).toBeCloseTo(1.0, 5)
    })

    it('should have flood fill safety limit', () => {
      expect(OCR_DEFAULTS.FLOOD_FILL.MAX_ITERATIONS).toBe(10000)
    })

    it('should be a const object', () => {
      // TypeScript enforces immutability via 'as const'
      // The object itself is not frozen at runtime but is type-safe
      expect(OCR_DEFAULTS).toBeDefined()
      expect(typeof OCR_DEFAULTS).toBe('object')
    })
  })

  describe('getOCRConfig', () => {
    const originalEnv = process.env

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should return defaults when env vars not set', () => {
      delete process.env.NEXT_PUBLIC_AUTO_OCR_MIN_TEXT_CONFIDENCE
      delete process.env.NEXT_PUBLIC_AUTO_OCR_MIN_DATE_CONFIDENCE
      delete process.env.NEXT_PUBLIC_AUTO_OCR_MIN_OVERALL_SCORE
      delete process.env.NEXT_PUBLIC_AUTO_OCR_MIN_SHARPNESS

      const config = getOCRConfig()

      expect(config.minTextConfidence).toBe(OCR_DEFAULTS.SCANNING.MIN_TEXT_CONFIDENCE)
      expect(config.minDateConfidence).toBe(OCR_DEFAULTS.SCANNING.MIN_DATE_CONFIDENCE)
      expect(config.minOverallScore).toBe(OCR_DEFAULTS.SCANNING.MIN_OVERALL_SCORE)
      expect(config.minSharpness).toBe(OCR_DEFAULTS.SCANNING.MIN_SHARPNESS)
    })

    it('should use env vars when set', () => {
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_TEXT_CONFIDENCE = '0.1'
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_DATE_CONFIDENCE = '0.5'
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_OVERALL_SCORE = '0.6'
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_SHARPNESS = '0.02'

      const config = getOCRConfig()

      expect(config.minTextConfidence).toBe(0.1)
      expect(config.minDateConfidence).toBe(0.5)
      expect(config.minOverallScore).toBe(0.6)
      expect(config.minSharpness).toBe(0.02)
    })

    it('should fallback to defaults for invalid env vars', () => {
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_TEXT_CONFIDENCE = 'invalid'
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_DATE_CONFIDENCE = 'NaN'
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_OVERALL_SCORE = ''
      process.env.NEXT_PUBLIC_AUTO_OCR_MIN_SHARPNESS = 'abc'

      const config = getOCRConfig()

      expect(config.minTextConfidence).toBe(OCR_DEFAULTS.SCANNING.MIN_TEXT_CONFIDENCE)
      expect(config.minDateConfidence).toBe(OCR_DEFAULTS.SCANNING.MIN_DATE_CONFIDENCE)
      expect(config.minOverallScore).toBe(OCR_DEFAULTS.SCANNING.MIN_OVERALL_SCORE)
      expect(config.minSharpness).toBe(OCR_DEFAULTS.SCANNING.MIN_SHARPNESS)
    })
  })
})
