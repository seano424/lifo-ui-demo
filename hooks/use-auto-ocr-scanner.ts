/**
 * Auto-OCR scanner hook with intelligent pre-checking
 * Uses client-side frame analysis to determine when to trigger expensive OCR API calls
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { captureImageFromVideo } from '@/lib/api/ocr-client'
import type { ExpiryDateInfo } from '@/lib/stores/scanning-workflow-store'
import { analyzeFrame, type FrameAnalysis } from '@/lib/utils/frame-analyzer'
import { logger } from '@/lib/utils/logger'
import { parseEnvFloat } from '@/lib/utils/ocr-config'
import { ocrDebugLogger } from '@/lib/utils/ocr-debug-logger'
import { isRateLimitError } from '@/lib/utils/ocr-type-guards'
import { useOCRWithFallback } from './use-ocr-processing'

export interface AutoOCRScannerOptions {
  // Enable/disable auto-scanning
  isEnabled: boolean

  // Callback when expiry date is detected
  onExpiryDetected: (expiryInfo: ExpiryDateInfo) => void

  // Store ID for OCR API call
  storeId: string

  // Scanning configuration
  preCheckIntervalMs?: number // How often to check frame quality (default: 500ms)
  maxAttempts?: number // Max OCR attempts before stopping (default: 10)
  ocrConfidenceThreshold?: number // Min confidence to accept OCR result (default: 0.5)

  // Frame analysis thresholds
  minTextConfidence?: number // Min text detection confidence (default: 0.05 for low-light conditions)
  minDateConfidence?: number // Min date pattern confidence (default: 0.4)
  minOverallScore?: number // Min overall score to trigger OCR (default: 0.5)
  minSharpness?: number // Min sharpness/focus (default: 0.02 for handwritten text on paper)

  // Debug mode
  debug?: boolean
}

export interface AutoOCRScannerState {
  // Scanning state
  isAnalyzing: boolean
  attemptCount: number
  lastAnalysis: FrameAnalysis | null
  lastReason: string | null // Human-readable reason for OCR trigger decision

  // Controls
  startAutoScan: () => void
  stopAutoScan: () => void
  resetAutoScan: () => void

  // Debug info
  totalFramesAnalyzed: number
  ocrTriggeredCount: number
}

/**
 * Validates user-provided options
 */
function validateOptions(options: AutoOCRScannerOptions): void {
  const {
    preCheckIntervalMs = 500,
    maxAttempts = 10,
    ocrConfidenceThreshold = 0.5,
    minTextConfidence,
    minDateConfidence,
    minOverallScore,
    minSharpness,
  } = options

  // Validate preCheckIntervalMs (100-5000ms)
  if (preCheckIntervalMs < 100 || preCheckIntervalMs > 5000) {
    throw new Error('preCheckIntervalMs must be between 100 and 5000 milliseconds')
  }

  // Validate maxAttempts (1-50)
  if (maxAttempts < 1 || maxAttempts > 50) {
    throw new Error('maxAttempts must be between 1 and 50')
  }

  // Validate threshold values (0-1)
  const thresholds = [
    { name: 'ocrConfidenceThreshold', value: ocrConfidenceThreshold },
    { name: 'minTextConfidence', value: minTextConfidence },
    { name: 'minDateConfidence', value: minDateConfidence },
    { name: 'minOverallScore', value: minOverallScore },
    { name: 'minSharpness', value: minSharpness },
  ]

  for (const { name, value } of thresholds) {
    if (value !== undefined && (value < 0 || value > 1)) {
      throw new Error(`${name} must be between 0 and 1`)
    }
  }
}

/**
 * Determines the reason for OCR trigger decision
 * Returns a human-readable explanation of why OCR was or wasn't triggered
 * NOTE: Text confidence is no longer a hard requirement (it's factored into overall score)
 */
function getOCRTriggerReason(
  analysis: FrameAnalysis,
  thresholds: {
    minDateConfidence: number
    minOverallScore: number
    minSharpness: number
  },
): string {
  if (analysis.shouldTriggerOCR) {
    return 'All thresholds met'
  }

  if (analysis.isBarcodeDetected) {
    return 'Barcode detected (wrong scanner mode)'
  }

  if (analysis.datePatternConfidence < thresholds.minDateConfidence) {
    return `Date pattern confidence too low (${(analysis.datePatternConfidence * 100).toFixed(0)}% < ${(thresholds.minDateConfidence * 100).toFixed(0)}%)`
  }

  if (analysis.brightness <= 0.2) {
    return `Too dark (brightness: ${(analysis.brightness * 100).toFixed(0)}%)`
  }

  if (analysis.brightness >= 0.9) {
    return `Overexposed (brightness: ${(analysis.brightness * 100).toFixed(0)}%)`
  }

  if (analysis.sharpness <= thresholds.minSharpness) {
    return `Too blurry (sharpness: ${(analysis.sharpness * 100).toFixed(0)}% < ${(thresholds.minSharpness * 100).toFixed(0)}%)`
  }

  // Default: overall score too low
  return `Overall score too low (${(analysis.overallScore * 100).toFixed(0)}% < ${(thresholds.minOverallScore * 100).toFixed(0)}%) - text: ${(analysis.textConfidence * 100).toFixed(0)}%, date: ${(analysis.datePatternConfidence * 100).toFixed(0)}%`
}

/**
 * Hook for auto-OCR scanning with intelligent pre-checks
 */
export function useAutoOCRScanner(options: AutoOCRScannerOptions): AutoOCRScannerState {
  // Validate options
  validateOptions(options)

  const {
    isEnabled,
    onExpiryDetected,
    storeId,
    preCheckIntervalMs = 500,
    maxAttempts = 10,
    ocrConfidenceThreshold = 0.5,
    minTextConfidence = parseEnvFloat(process.env.NEXT_PUBLIC_AUTO_OCR_MIN_TEXT_CONFIDENCE, 0.05),
    minDateConfidence = parseEnvFloat(process.env.NEXT_PUBLIC_AUTO_OCR_MIN_DATE_CONFIDENCE, 0.4),
    minOverallScore = parseEnvFloat(process.env.NEXT_PUBLIC_AUTO_OCR_MIN_OVERALL_SCORE, 0.5),
    minSharpness = parseEnvFloat(process.env.NEXT_PUBLIC_AUTO_OCR_MIN_SHARPNESS, 0.01),
    debug = false,
  } = options

  // State
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [lastAnalysis, setLastAnalysis] = useState<FrameAnalysis | null>(null)
  const [lastReason, setLastReason] = useState<string | null>(null)
  const [totalFramesAnalyzed, setTotalFramesAnalyzed] = useState(0)
  const [ocrTriggeredCount, setOcrTriggeredCount] = useState(0)

  // Refs to prevent stale closures
  const preCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isProcessingOCRRef = useRef(false)

  // Rate limit tracking
  const rateLimitPausedUntilRef = useRef<number>(0)
  const consecutiveRateLimitsRef = useRef<number>(0)

  // OCR processing hook
  const { processExpiryDate, isLoading: isOCRProcessing } = useOCRWithFallback()

  // Update processing ref when loading state changes
  useEffect(() => {
    isProcessingOCRRef.current = isOCRProcessing
  }, [isOCRProcessing])

  /**
   * Analyze current video frame for text/date patterns
   */
  const analyzeCurrentFrame = useCallback(async (): Promise<FrameAnalysis | null> => {
    const startTime = performance.now()
    let canvas: HTMLCanvasElement | null = null

    try {
      const videoElement = document.querySelector('video') as HTMLVideoElement | null
      if (!videoElement || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
        return null
      }

      // Create canvas and capture frame
      canvas = document.createElement('canvas')
      canvas.width = videoElement.videoWidth
      canvas.height = videoElement.videoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

      // Analyze frame
      const analysis = analyzeFrame(canvas, {
        debug,
        minTextConfidence,
        minDateConfidence,
        minOverallScore,
        minSharpness,
      })

      setLastAnalysis(analysis)
      setTotalFramesAnalyzed(prev => prev + 1)

      const duration = performance.now() - startTime

      // Calculate reason for OCR trigger decision using helper function
      const reason = getOCRTriggerReason(analysis, {
        minDateConfidence,
        minOverallScore,
        minSharpness,
      })

      // Store the reason in state
      setLastReason(reason)

      // Debug logging
      ocrDebugLogger.logFrameAnalysis({
        shouldTriggerOCR: analysis.shouldTriggerOCR,
        textConfidence: analysis.textConfidence,
        datePatternConfidence: analysis.datePatternConfidence,
        overallScore: analysis.overallScore,
        reason,
      })

      if (debug) {
        logger.log('AutoOCRScanner', 'Frame analysis result', {
          shouldTriggerOCR: analysis.shouldTriggerOCR,
          textConfidence: analysis.textConfidence,
          datePatternConfidence: analysis.datePatternConfidence,
          overallScore: analysis.overallScore,
          brightness: analysis.brightness,
          sharpness: analysis.sharpness,
          duration: `${duration.toFixed(1)}ms`,
        })
      }

      return analysis
    } catch (error) {
      logger.error('AutoOCRScanner', 'Frame analysis failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    } finally {
      // Clean up canvas to prevent memory leaks
      if (canvas) {
        canvas.width = 0
        canvas.height = 0
      }
    }
  }, [debug, minTextConfidence, minDateConfidence, minOverallScore, minSharpness])

  /**
   * Trigger OCR processing on current frame
   */
  const triggerOCR = useCallback(async () => {
    // Check if we're in rate limit pause period
    const now = Date.now()
    if (rateLimitPausedUntilRef.current > now) {
      const remainingPause = Math.ceil((rateLimitPausedUntilRef.current - now) / 1000)
      logger.log('AutoOCRScanner', 'Rate limit pause active, skipping OCR', {
        remainingSeconds: remainingPause,
        consecutiveRateLimits: consecutiveRateLimitsRef.current,
      })
      return
    }

    if (isProcessingOCRRef.current) {
      logger.log('AutoOCRScanner', 'OCR already in progress, skipping', {
        isProcessing: isProcessingOCRRef.current,
        attemptCount,
      })
      ocrDebugLogger.logOCRTrigger(false, 'OCR already in progress', {
        attemptNumber: attemptCount + 1,
      })
      return
    }

    // Set processing flag IMMEDIATELY to prevent concurrent calls
    isProcessingOCRRef.current = true

    const apiStartTime = performance.now()

    try {
      const videoElement = document.querySelector('video') as HTMLVideoElement | null
      if (!videoElement) {
        logger.error('AutoOCRScanner', 'Video element not found')
        isProcessingOCRRef.current = false
        return
      }

      const currentAttempt = attemptCount + 1

      logger.log('AutoOCRScanner', 'Triggering OCR', {
        attemptCount: currentAttempt,
        maxAttempts,
      })

      ocrDebugLogger.logOCRTrigger(true, 'Pre-check passed all thresholds', {
        attemptNumber: currentAttempt,
        maxAttempts,
        storeId,
      })

      setAttemptCount(prev => prev + 1)
      setOcrTriggeredCount(prev => prev + 1)

      // Capture frame
      const imageBlob = await captureImageFromVideo(videoElement)

      // Log API call
      ocrDebugLogger.logAPICall('/api/v1/ocr/scan/full-ocr', 'POST', {
        imageSizeKB: (imageBlob.size / 1024).toFixed(1),
        confidenceThreshold: ocrConfidenceThreshold,
        attemptNumber: currentAttempt,
      })

      // Process with OCR (use full analysis to get batch numbers)
      const result = await processExpiryDate(imageBlob, storeId, {
        confidenceThreshold: ocrConfidenceThreshold,
        maxProcessingTimeMs: 5000,
        useFullAnalysis: true, // Enable batch number detection
      })

      const apiDuration = performance.now() - apiStartTime

      logger.log('AutoOCRScanner', 'OCR result received', {
        success: result.success,
        hasExpiryDateInfo: !!result.expiryDateInfo,
        extractedDate: result.expiryDateInfo?.extractedDate,
        confidence: result.expiryDateInfo?.confidence,
        fallbackToManual: result.fallbackToManual,
        duration: `${apiDuration.toFixed(0)}ms`,
      })

      if (result.success && result.expiryDateInfo?.extractedDate) {
        // Success! Reset rate limit tracking and stop auto-scanning
        consecutiveRateLimitsRef.current = 0
        rateLimitPausedUntilRef.current = 0

        ocrDebugLogger.logAPISuccess(
          '/api/v1/ocr/scan/full-ocr',
          {
            extractedDate: result.expiryDateInfo.extractedDate,
            confidence: result.expiryDateInfo.confidence,
            rawOcrText: result.expiryDateInfo.rawOcrText,
            totalAttempts: currentAttempt,
          },
          apiDuration,
        )

        logger.log('AutoOCRScanner', 'Expiry date detected, stopping auto-scan', {
          extractedDate: result.expiryDateInfo.extractedDate,
          confidence: result.expiryDateInfo.confidence,
          totalAttempts: currentAttempt,
        })

        ocrDebugLogger.logLifecycle('STOP', {
          reason: 'Date found',
          totalAttempts: currentAttempt,
          successRate: `${((1 / currentAttempt) * 100).toFixed(0)}%`,
        })

        isProcessingOCRRef.current = false // Reset flag before stopping
        setIsAnalyzing(false)
        onExpiryDetected(result.expiryDateInfo)
      } else {
        // OCR didn't find a date
        ocrDebugLogger.logAPISuccess(
          '/api/v1/ocr/scan/full-ocr',
          {
            noDateFound: true,
            rawOcrText: result.expiryDateInfo?.rawOcrText || 'none',
          },
          apiDuration,
        )

        // Continue scanning if under max attempts
        if (currentAttempt >= maxAttempts) {
          logger.warn('AutoOCRScanner', 'Max OCR attempts reached, stopping auto-scan', {
            maxAttempts,
          })

          ocrDebugLogger.logLifecycle('MAX_ATTEMPTS', {
            totalAttempts: currentAttempt,
            maxAttempts,
            dateFound: false,
          })

          isProcessingOCRRef.current = false // Reset flag
          setIsAnalyzing(false)
        } else {
          logger.log('AutoOCRScanner', 'No date found, continuing auto-scan', {
            currentAttempt,
            maxAttempts,
          })
          isProcessingOCRRef.current = false // Reset flag to allow next attempt
        }
      }
    } catch (error) {
      const apiDuration = performance.now() - apiStartTime

      ocrDebugLogger.logAPIFailure('/api/v1/ocr/scan/ocr-expiry', error, apiDuration)

      // Log error details
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('AutoOCRScanner', 'OCR processing failed', {
        error: errorMessage,
        attemptCount: attemptCount + 1,
      })

      // Special handling for rate limit errors using type guard
      if (isRateLimitError(error)) {
        consecutiveRateLimitsRef.current += 1

        // Calculate backoff time (exponential: 5s, 10s, 20s, 30s max)
        const backoffSeconds = Math.min(5 * 2 ** (consecutiveRateLimitsRef.current - 1), 30)
        rateLimitPausedUntilRef.current = Date.now() + backoffSeconds * 1000

        logger.warn('AutoOCRScanner', 'Rate limit hit - pausing auto-scan', {
          consecutiveRateLimits: consecutiveRateLimitsRef.current,
          pauseSeconds: backoffSeconds,
          pausedUntil: new Date(rateLimitPausedUntilRef.current).toISOString(),
        })

        ocrDebugLogger.logLifecycle('RATE_LIMIT_PAUSE', {
          consecutiveRateLimits: consecutiveRateLimitsRef.current,
          pauseSeconds: backoffSeconds,
          totalAttempts: attemptCount + 1,
        })

        // If too many consecutive rate limits (>3), stop auto-scanning entirely
        if (consecutiveRateLimitsRef.current >= 3) {
          logger.error(
            'AutoOCRScanner',
            'Too many consecutive rate limits - stopping auto-scan permanently',
            {
              consecutiveRateLimits: consecutiveRateLimitsRef.current,
            },
          )

          ocrDebugLogger.logLifecycle('STOP', {
            reason: 'Too many rate limits',
            consecutiveRateLimits: consecutiveRateLimitsRef.current,
            totalAttempts: attemptCount + 1,
          })

          isProcessingOCRRef.current = false
          setIsAnalyzing(false)
          return
        }

        // Otherwise, pause and continue after backoff
        isProcessingOCRRef.current = false
        return
      }

      // Continue scanning on other errors (unless max attempts reached)
      if (attemptCount + 1 >= maxAttempts) {
        logger.warn('AutoOCRScanner', 'Max OCR attempts reached after error, stopping')

        ocrDebugLogger.logLifecycle('MAX_ATTEMPTS', {
          totalAttempts: attemptCount + 1,
          maxAttempts,
          endedWithError: true,
        })

        isProcessingOCRRef.current = false // Reset flag
        setIsAnalyzing(false)
      } else {
        isProcessingOCRRef.current = false // Reset flag to allow next attempt
      }
    }
  }, [
    attemptCount,
    maxAttempts,
    storeId,
    ocrConfidenceThreshold,
    onExpiryDetected,
    processExpiryDate,
  ])

  /**
   * Main pre-check loop
   */
  useEffect(() => {
    // Only run if enabled, analyzing, and not at max attempts
    if (!isEnabled || !isAnalyzing || attemptCount >= maxAttempts) {
      return
    }

    // Create AbortController for cleanup
    const abortController = new AbortController()

    logger.log('AutoOCRScanner', 'Starting pre-check loop', {
      preCheckIntervalMs,
      maxAttempts,
      currentAttempts: attemptCount,
    })

    const interval = setInterval(async () => {
      // Check if aborted
      if (abortController.signal.aborted) {
        return
      }

      // Skip if OCR is currently processing
      if (isProcessingOCRRef.current) {
        if (debug) {
          logger.log('AutoOCRScanner', 'Skipping pre-check (OCR in progress)')
        }
        return
      }

      // Analyze current frame
      const analysis = await analyzeCurrentFrame()

      // Check if aborted after async operation
      if (abortController.signal.aborted) {
        return
      }

      // Double-check OCR isn't processing (might have started during frame analysis)
      if (isProcessingOCRRef.current) {
        if (debug) {
          logger.log('AutoOCRScanner', 'Skipping trigger (OCR started during frame analysis)')
        }
        return
      }

      // Trigger OCR if pre-check passes
      if (analysis?.shouldTriggerOCR) {
        logger.log('AutoOCRScanner', 'Pre-check passed! Triggering OCR', {
          textConfidence: analysis.textConfidence,
          datePatternConfidence: analysis.datePatternConfidence,
          overallScore: analysis.overallScore,
        })

        await triggerOCR()
      } else if (debug && analysis) {
        logger.log('AutoOCRScanner', 'Pre-check failed', {
          shouldTriggerOCR: analysis.shouldTriggerOCR,
          hasTextLikeContent: analysis.hasTextLikeContent,
          hasDatePattern: analysis.hasDatePattern,
          textConfidence: analysis.textConfidence,
          datePatternConfidence: analysis.datePatternConfidence,
          overallScore: analysis.overallScore,
        })
      }
    }, preCheckIntervalMs)

    preCheckIntervalRef.current = interval

    return () => {
      // Abort any pending async operations
      abortController.abort()

      if (preCheckIntervalRef.current) {
        clearInterval(preCheckIntervalRef.current)
        preCheckIntervalRef.current = null
      }
    }
  }, [
    isEnabled,
    isAnalyzing,
    attemptCount,
    maxAttempts,
    preCheckIntervalMs,
    analyzeCurrentFrame,
    triggerOCR,
    debug,
  ])

  /**
   * Start auto-scanning
   */
  const startAutoScan = useCallback(() => {
    logger.log('AutoOCRScanner', 'Starting auto-scan')

    ocrDebugLogger.logLifecycle('START', {
      preCheckInterval: `${preCheckIntervalMs}ms`,
      maxAttempts,
      confidenceThreshold: ocrConfidenceThreshold,
    })

    setIsAnalyzing(true)
    setAttemptCount(0)
    setTotalFramesAnalyzed(0)
    setOcrTriggeredCount(0)
  }, [preCheckIntervalMs, maxAttempts, ocrConfidenceThreshold])

  /**
   * Stop auto-scanning
   */
  const stopAutoScan = useCallback(() => {
    logger.log('AutoOCRScanner', 'Stopping auto-scan', {
      totalAttempts: attemptCount,
      totalFramesAnalyzed,
      ocrTriggeredCount,
    })

    ocrDebugLogger.logLifecycle('STOP', {
      totalAttempts: attemptCount,
      totalFramesAnalyzed,
      ocrTriggeredCount,
      efficiency:
        attemptCount > 0
          ? `${((ocrTriggeredCount / totalFramesAnalyzed) * 100).toFixed(2)}%`
          : '0%',
    })

    // Print statistics summary
    ocrDebugLogger.printStats()

    setIsAnalyzing(false)

    if (preCheckIntervalRef.current) {
      clearInterval(preCheckIntervalRef.current)
      preCheckIntervalRef.current = null
    }
  }, [attemptCount, totalFramesAnalyzed, ocrTriggeredCount])

  /**
   * Reset auto-scan state
   */
  const resetAutoScan = useCallback(() => {
    logger.log('AutoOCRScanner', 'Resetting auto-scan')
    setIsAnalyzing(false)
    setAttemptCount(0)
    setLastAnalysis(null)
    setLastReason(null)
    setTotalFramesAnalyzed(0)
    setOcrTriggeredCount(0)

    if (preCheckIntervalRef.current) {
      clearInterval(preCheckIntervalRef.current)
      preCheckIntervalRef.current = null
    }
  }, [])

  // Auto-start when enabled
  useEffect(() => {
    if (isEnabled && !isAnalyzing) {
      logger.log('AutoOCRScanner', 'Auto-starting scan (enabled)')
      startAutoScan()
    }
  }, [isEnabled, isAnalyzing, startAutoScan])

  // Auto-stop when max attempts reached
  useEffect(() => {
    if (attemptCount >= maxAttempts && isAnalyzing) {
      logger.warn('AutoOCRScanner', 'Max attempts reached, auto-stopping', {
        attemptCount,
        maxAttempts,
      })
      stopAutoScan()
    }
  }, [attemptCount, maxAttempts, isAnalyzing, stopAutoScan])

  // Reset when disabled
  useEffect(() => {
    if (!isEnabled && isAnalyzing) {
      logger.log('AutoOCRScanner', 'Disabled, stopping scan')
      resetAutoScan()
    }
  }, [isEnabled, isAnalyzing, resetAutoScan])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (preCheckIntervalRef.current) {
        clearInterval(preCheckIntervalRef.current)
      }
    }
  }, [])

  return {
    isAnalyzing,
    attemptCount,
    lastAnalysis,
    lastReason,
    totalFramesAnalyzed,
    ocrTriggeredCount,
    startAutoScan,
    stopAutoScan,
    resetAutoScan,
  }
}
