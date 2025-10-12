/**
 * Visual feedback overlay for OCR frame quality
 * Shows real-time indicators to help users position camera correctly
 */

import { Camera, Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { FrameAnalysis } from '@/lib/utils/frame-analyzer'
import { parseEnvFloat } from '@/lib/utils/ocr-config'
import { cn } from '@/lib/utils'

export interface OCRFrameQualityIndicatorProps {
  analysis: FrameAnalysis | null
  isAnalyzing: boolean
  attemptCount: number
  maxAttempts: number
  className?: string
  showDebugInfo?: boolean
}

export default function OCRFrameQualityIndicator({
  analysis,
  isAnalyzing,
  attemptCount,
  maxAttempts,
  className,
  showDebugInfo = false,
}: OCRFrameQualityIndicatorProps) {
  const t = useTranslations('ocr')
  const minSharpness = parseEnvFloat(process.env.NEXT_PUBLIC_AUTO_OCR_MIN_SHARPNESS, 0.01)

  // Null safety: ensure we have valid analysis data
  if (!isAnalyzing || !analysis) {
    return null
  }

  // Additional safety: validate analysis has required numeric properties
  if (
    typeof analysis.overallScore !== 'number' ||
    typeof analysis.textConfidence !== 'number' ||
    typeof analysis.datePatternConfidence !== 'number'
  ) {
    return null
  }

  return (
    <div
      className={cn(
        'absolute top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs space-y-2 min-w-[180px] backdrop-blur-sm',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="OCR scan quality indicator"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/20 pb-2">
        <Camera className="w-4 h-4" />
        <span className="font-semibold">
          Auto-Scan {attemptCount}/{maxAttempts}
        </span>
      </div>

      {/* Quality Indicators */}
      <div className="space-y-1.5">
        {/* Text Detection */}
        <QualityIndicator
          label={t('ocrFrameQuality.textDetected', {
            defaultValue: 'Text detected',
          })}
          isGood={analysis.hasTextLikeContent}
          confidence={analysis.textConfidence}
        />

        {/* Date Pattern */}
        <QualityIndicator
          label={t('ocrFrameQuality.datePattern', {
            defaultValue: 'Date pattern',
          })}
          isGood={analysis.hasDatePattern}
          confidence={analysis.datePatternConfidence}
        />

        {/* Lighting */}
        <QualityIndicator
          label={t('ocrFrameQuality.lighting', {
            defaultValue: 'Good lighting',
          })}
          isGood={analysis.brightness > 0.2 && analysis.brightness < 0.9}
          confidence={analysis.brightness > 0.5 ? analysis.brightness : 1 - analysis.brightness}
        />

        {/* Focus */}
        <QualityIndicator
          label={t('ocrFrameQuality.focus', { defaultValue: 'In focus' })}
          isGood={analysis.sharpness > minSharpness}
          confidence={analysis.sharpness}
        />

        {/* Contrast */}
        <QualityIndicator
          label={t('ocrFrameQuality.contrast', {
            defaultValue: 'Good contrast',
          })}
          isGood={analysis.contrast > 0.3}
          confidence={analysis.contrast}
        />
      </div>

      {/* Overall Status */}
      <div className="pt-2 border-t border-white/20">
        <div className="flex items-center justify-between">
          <span className="text-xs opacity-75">
            {t('ocrFrameQuality.quality', { defaultValue: 'Quality' })}
          </span>
          <span className="font-bold">{Math.round(analysis.overallScore * 100)}%</span>
        </div>

        {/* Ready Indicator */}
        {analysis.shouldTriggerOCR ? (
          <div className="mt-2 flex items-center gap-1.5 text-green-400 font-semibold animate-pulse">
            <Camera className="w-3.5 h-3.5" />
            <span>
              {t('ocrFrameQuality.readyToScan', {
                defaultValue: '📸 Scanning...',
              })}
            </span>
          </div>
        ) : (
          <div className="mt-2 text-yellow-400 text-xs">{getPositioningHint(analysis, t)}</div>
        )}
      </div>

      {/* Debug Info */}
      {showDebugInfo && analysis.debugInfo && (
        <div className="pt-2 border-t border-white/20 text-[10px] opacity-60 space-y-0.5">
          <div>Edges: {analysis.debugInfo.edgePercentage.toFixed(1)}%</div>
          <div>Shapes: {analysis.debugInfo.numberLikeShapes}</div>
          <div>Sep: {analysis.debugInfo.hasSeparators ? 'Yes' : 'No'}</div>
          <div>H-Lines: {analysis.debugInfo.horizontalPatterns ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  )
}

/**
 * Individual quality indicator component
 */
function QualityIndicator({
  label,
  isGood,
  confidence,
}: {
  label: string
  isGood: boolean
  confidence: number
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <StatusDot isGood={isGood} />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs opacity-75">{Math.round(confidence * 100)}%</span>
    </div>
  )
}

/**
 * Status dot indicator
 */
function StatusDot({ isGood }: { isGood: boolean }) {
  if (isGood) {
    return (
      <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
        <Check className="w-3 h-3 text-green-400" strokeWidth={3} />
      </div>
    )
  }

  return (
    <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
      <X className="w-3 h-3 text-red-400" strokeWidth={3} />
    </div>
  )
}

/**
 * Get helpful positioning hint based on what's missing
 */
function getPositioningHint(
  analysis: FrameAnalysis,
  t: (key: string, options?: Record<string, string>) => string,
): string {
  const minSharpness = parseEnvFloat(process.env.NEXT_PUBLIC_AUTO_OCR_MIN_SHARPNESS, 0.01)

  // Prioritize hints by importance
  if (!analysis.hasTextLikeContent) {
    return t('ocrFrameQuality.hintMoveCloser', {
      defaultValue: 'Move closer to text',
    })
  }

  if (analysis.brightness < 0.2) {
    return t('ocrFrameQuality.hintMoreLight', {
      defaultValue: 'Need more light',
    })
  }

  if (analysis.brightness > 0.9) {
    return t('ocrFrameQuality.hintTooLight', {
      defaultValue: 'Too bright, adjust angle',
    })
  }

  if (analysis.sharpness < minSharpness) {
    return t('ocrFrameQuality.hintHoldSteady', {
      defaultValue: 'Hold steady to focus',
    })
  }

  if (!analysis.hasDatePattern) {
    return t('ocrFrameQuality.hintFindDate', {
      defaultValue: 'Point at expiry date',
    })
  }

  if (analysis.contrast < 0.3) {
    return t('ocrFrameQuality.hintImproveAngle', {
      defaultValue: 'Adjust angle for clarity',
    })
  }

  return t('ocrFrameQuality.hintPositioning', {
    defaultValue: 'Keep positioning...',
  })
}
