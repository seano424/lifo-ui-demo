'use client'

import BarcodeScanner, { type BarcodeDetection } from '@/components/barcode/barcode-scanner'
import ManualBarcodeEntry from '@/components/barcode/manual-barcode-entry'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { AutoOCRScannerState } from '@/hooks/use-auto-ocr-scanner'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { AlertCircle, Camera, Keyboard } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import OCRFrameQualityIndicator from './ocr-frame-quality-indicator'

export interface ScanningCameraProps {
  // Camera mode
  mode: 'barcode' | 'ocr'
  title?: string
  subtitle?: string
  className?: string

  // Barcode scanning props
  onBarcodeScanned?: (barcode: string, detection?: BarcodeDetection) => void
  onScanError?: (error: Error) => void

  // OCR props
  onOCRCapture?: () => Promise<void>
  isOCRProcessing?: boolean
  ocrError?: string | null
  onClearOCRError?: () => void

  // Auto-OCR props
  autoOCRState?: AutoOCRScannerState

  // Manual entry props
  showManualEntry?: boolean
  onToggleManualEntry?: () => void
  onManualProductSelected?: (barcode: string) => void
  onCloseManualEntry?: () => void
  manualEntryMode?: 'deliveries' | 'outbound' // For ManualBarcodeEntry mode
  storeId?: string // For outbound manual entry

  // Backend health
  isBackendHealthy?: boolean | null

  // Auto-start camera
  autoStart?: boolean
}

export default function ScanningCamera({
  mode,
  title,
  subtitle,
  className,
  onBarcodeScanned,
  onScanError,
  onOCRCapture,
  isOCRProcessing = false,
  ocrError,
  onClearOCRError,
  autoOCRState,
  showManualEntry = false,
  manualEntryMode = 'deliveries',
  storeId,
  onToggleManualEntry,
  onManualProductSelected,
  onCloseManualEntry,
  isBackendHealthy,
  autoStart = true,
}: ScanningCameraProps) {
  const t = useTranslations('scanningCamera')

  // Logging for debugging OCR capture flow
  const handleOCRCapture = async () => {
    logger.log('ScanningCamera', 'OCR Capture button clicked', {
      mode,
      isOCRProcessing,
      isBackendHealthy,
      hasOCRCaptureHandler: !!onOCRCapture,
    })

    if (!onOCRCapture) {
      logger.error('ScanningCamera', 'OCR Capture handler is not defined')
      return
    }

    try {
      logger.log('ScanningCamera', 'Calling OCR capture handler...')
      await onOCRCapture()
      logger.log('ScanningCamera', 'OCR capture handler completed successfully')
    } catch (error) {
      logger.error('ScanningCamera', 'OCR capture handler failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
    }
  }

  // Get appropriate title based on mode
  const cameraTitle =
    title || (mode === 'barcode' ? t('titles.scanProduct') : t('titles.scanExpiryDate'))
  const cameraSubtitle =
    subtitle ||
    (mode === 'barcode' ? t('subtitles.pointAtBarcode') : t('subtitles.pointAtExpiryDate'))
  const permissionMessage =
    mode === 'barcode' ? t('permissions.barcodeRequired') : t('permissions.expiryRequired')

  // Log component mount and state changes
  useEffect(() => {
    logger.log('ScanningCamera', 'Component mounted/updated', {
      mode,
      autoStart,
      isBackendHealthy,
      isOCRProcessing,
      hasOCRError: !!ocrError,
      showManualEntry,
    })
  }, [mode, autoStart, isBackendHealthy, isOCRProcessing, ocrError, showManualEntry])

  // Log OCR processing state changes
  useEffect(() => {
    if (mode === 'ocr' && isOCRProcessing) {
      logger.log('ScanningCamera', 'OCR processing started')
    } else if (mode === 'ocr' && !isOCRProcessing) {
      logger.log('ScanningCamera', 'OCR processing ended')
    }
  }, [mode, isOCRProcessing])

  // Log OCR errors
  useEffect(() => {
    if (ocrError) {
      logger.error('ScanningCamera', 'OCR error occurred', { error: ocrError })
    }
  }, [ocrError])

  return (
    <div className={cn(className, 'space-y-4')}>
      {/* Camera Scanner */}
      <div className="space-y-2 relative">
        <BarcodeScanner
          onScan={mode === 'barcode' && onBarcodeScanned ? onBarcodeScanned : () => {}}
          onError={onScanError || (() => {})}
          autoStart={autoStart}
          title={cameraTitle}
          subtitle={cameraSubtitle}
          permissionMessage={permissionMessage}
        />

        {/* Frame Quality Indicator for Auto-OCR */}
        {mode === 'ocr' && autoOCRState && process.env.NEXT_PUBLIC_DEBUG_OCR === 'true' && (
          <OCRFrameQualityIndicator
            analysis={autoOCRState.lastAnalysis}
            isAnalyzing={autoOCRState.isAnalyzing}
            attemptCount={autoOCRState.attemptCount}
            maxAttempts={10}
            reason={autoOCRState.lastReason ?? undefined}
          />
        )}
      </div>

      {/* OCR Mode - Capture Button and Error Display */}
      {mode === 'ocr' && (
        <>
          {/* Backend Health Warning */}
          {isBackendHealthy === false && !ocrError && (
            <Alert variant="default" className="border-none flex justify-center">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t('alerts.serviceUnavailable')}</AlertDescription>
            </Alert>
          )}

          {/* OCR Error Display */}
          {ocrError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('alerts.ocrError', { error: ocrError })}
                {isBackendHealthy === false && (
                  <span className="block mt-1 text-xs">{t('alerts.backendUnavailable')}</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* OCR Action Buttons */}
          {isBackendHealthy !== false && (
            <div className="space-y-2">
              {/* Manual Capture Button (always available as fallback) */}
              <div className="flex gap-2">
                <Button onClick={handleOCRCapture} className="flex-1" disabled={isOCRProcessing}>
                  <Camera className="w-4 h-4 mr-2" />
                  {isOCRProcessing
                    ? t('buttons.processingOCR')
                    : autoOCRState
                      ? t('buttons.captureExpiryDate') // Auto-OCR enabled - button is fallback
                      : t('buttons.captureExpiryDate')}{' '}
                  {/* Manual mode only */}
                </Button>
                {ocrError && onClearOCRError && (
                  <Button onClick={onClearOCRError} variant="outline" size="sm">
                    {t('buttons.clearError', { defaultValue: 'Clear' })}
                  </Button>
                )}
              </div>

              {/* Mode Indicator */}
              {!autoOCRState && (
                <div className="text-xs text-gray-600 text-center bg-gray-50 p-2 rounded">
                  📸 Manual mode: Click button to capture expiry date
                </div>
              )}

              {/* Auto-Scan Stats (Debug) */}
              {autoOCRState?.isAnalyzing && process.env.NEXT_PUBLIC_DEBUG_OCR === 'true' && (
                <div className="text-xs text-gray-500 text-center">
                  Auto-scanning... Frames: {autoOCRState.totalFramesAnalyzed} | OCR:{' '}
                  {autoOCRState.ocrTriggeredCount}
                </div>
              )}

              {autoOCRState?.isAnalyzing && process.env.NEXT_PUBLIC_DEBUG_OCR !== 'true' && (
                <div className="text-xs text-primary-600 text-center bg-primary-50 p-2 rounded animate-pulse">
                  🤖 Auto-scanning active... Hold camera steady on expiry date
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Manual Entry for Barcode Mode */}
      {mode === 'barcode' && (
        <>
          {/* Manual Barcode Entry */}
          {showManualEntry && onManualProductSelected && onCloseManualEntry && (
            <div className="space-y-4">
              <ManualBarcodeEntry
                onProductSelected={onManualProductSelected}
                mode={manualEntryMode}
                storeId={storeId}
              />
            </div>
          )}

          {!showManualEntry && onToggleManualEntry && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={onToggleManualEntry} className="flex-1">
                <Keyboard className="w-4 h-4 mr-2" />
                {t('buttons.manualEntry')}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Instructional Alert for Barcode Mode */}
      {mode === 'barcode' && !showManualEntry && (
        <Alert className="flex items-center gap-4">
          <div>
            <Camera className="text-secondary-900 rounded-full p-[8px] border border-secondary-900 bg-primary-100 flex-shrink-0 h-8 w-8" />
          </div>
          <AlertDescription>{t('alerts.scanInstructions')}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
