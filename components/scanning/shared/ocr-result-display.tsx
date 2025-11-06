/**
 * Display component for OCR scan results
 * Shows extracted date, confidence score, raw OCR text, and validation feedback
 * Formats dates in European format (dd/mm/yyyy)
 */

import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  formatToEuropeanDate,
  parseAndValidateOCRDate,
  validateExpiryDate,
} from '@/lib/utils/date-conversion'

export interface OCRResultDisplayProps {
  extractedDate?: string // ISO format from backend
  confidence?: number // 0-1 confidence score from OCR
  rawOcrText?: string // Raw text detected by OCR
  className?: string
  showRawText?: boolean // Whether to display the raw OCR text
  showValidation?: boolean // Whether to show validation status
}

export default function OCRResultDisplay({
  extractedDate,
  confidence,
  rawOcrText,
  className,
  showRawText = true,
  showValidation = true,
}: OCRResultDisplayProps) {
  const t = useTranslations('ocr')

  // If no data, don't render anything
  if (!extractedDate && !rawOcrText) {
    return null
  }

  // Format date to European format
  const europeanDate = extractedDate ? formatToEuropeanDate(extractedDate) : null

  // Validate the extracted date
  const validation = extractedDate ? validateExpiryDate(extractedDate) : null

  // Parse and validate raw OCR text if date extraction failed
  const rawParsed =
    !extractedDate && rawOcrText
      ? parseAndValidateOCRDate(rawOcrText, confidence || 0)
      : null

  // Determine overall status
  const isSuccess = validation?.valid || false
  const hasWarning = !!(extractedDate && !validation?.valid)
  const hasInfo = !extractedDate && rawOcrText

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-3',
        isSuccess && 'border-green-500/50 bg-green-50 dark:bg-green-950/20',
        hasWarning && 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20',
        hasInfo && 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/20',
        className,
      )}
      role="region"
      aria-label="OCR scan result"
    >
      {/* Header with icon */}
      <div className="flex items-center gap-2">
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />}
        {hasWarning && <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />}
        {hasInfo && <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />}

        <span className="font-semibold text-sm">
          {isSuccess && t('result.success', { defaultValue: 'Date Detected' })}
          {hasWarning && t('result.warning', { defaultValue: 'Date Needs Review' })}
          {hasInfo && t('result.info', { defaultValue: 'Text Detected' })}
        </span>
      </div>

      {/* Extracted Date */}
      {europeanDate && (
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('result.expiryDate', { defaultValue: 'Expiry Date' })}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {europeanDate}
          </div>
        </div>
      )}

      {/* Confidence Score */}
      {confidence !== undefined && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {t('result.confidence', { defaultValue: 'Confidence' })}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all',
                  confidence >= 0.8 && 'bg-green-500',
                  confidence >= 0.6 && confidence < 0.8 && 'bg-yellow-500',
                  confidence < 0.6 && 'bg-red-500',
                )}
                style={{ width: `${Math.round(confidence * 100)}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 min-w-[3rem] text-right">
              {Math.round(confidence * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Validation Message */}
      {showValidation && validation && !validation.valid && (
        <div className="text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 rounded p-2">
          <span className="font-semibold">
            {t('result.validationWarning', { defaultValue: 'Warning:' })}{' '}
          </span>
          {validation.reason}
        </div>
      )}

      {/* Alternative date suggestion from raw text */}
      {rawParsed?.isoDate && rawParsed.isoDate !== extractedDate && (
        <div className="text-sm text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded p-2">
          <span className="font-semibold">
            {t('result.alternativeDate', { defaultValue: 'Alternative:' })}{' '}
          </span>
          {rawParsed.europeanDate}
          {rawParsed.validationError && ` (${rawParsed.validationError})`}
        </div>
      )}

      {/* Raw OCR Text */}
      {showRawText && rawOcrText && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('result.detectedText', { defaultValue: 'Detected Text' })}
          </div>
          <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded p-2 text-gray-800 dark:text-gray-300 break-all">
            "{rawOcrText}"
          </div>
        </div>
      )}

      {/* Helpful hint if confidence is low */}
      {confidence !== undefined && confidence < 0.7 && (
        <div className="text-xs text-gray-600 dark:text-gray-400 italic">
          {t('result.lowConfidenceHint', {
            defaultValue: 'Low confidence - please verify the date is correct',
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Compact version for inline display
 */
export function OCRResultCompact({
  extractedDate,
  confidence,
  className,
}: Pick<OCRResultDisplayProps, 'extractedDate' | 'confidence' | 'className'>) {
  const t = useTranslations('ocr')

  if (!extractedDate) return null

  const europeanDate = formatToEuropeanDate(extractedDate)
  const validation = validateExpiryDate(extractedDate)

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md',
        validation.valid
          ? 'bg-green-50 dark:bg-green-950/20 text-green-900 dark:text-green-100'
          : 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-900 dark:text-yellow-100',
        className,
      )}
    >
      {validation.valid ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <AlertCircle className="w-4 h-4" />
      )}

      <span className="font-semibold">{europeanDate}</span>

      {confidence !== undefined && (
        <span className="text-xs opacity-75">({Math.round(confidence * 100)}%)</span>
      )}
    </div>
  )
}
