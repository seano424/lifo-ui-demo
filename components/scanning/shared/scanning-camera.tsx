'use client'

import { AlertCircle, Camera, Keyboard } from 'lucide-react'
import BarcodeScanner, {
  type BarcodeDetection,
} from '@/components/barcode/barcode-scanner'
import ManualBarcodeEntry from '@/components/barcode/manual-barcode-entry'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

  // Manual entry props
  showManualEntry?: boolean
  onToggleManualEntry?: () => void
  onManualProductSelected?: (barcode: string) => void
  onCloseManualEntry?: () => void
  manualEntryMode?: 'inbound' | 'outbound' // For ManualBarcodeEntry mode
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
  showManualEntry = false,
  manualEntryMode = 'inbound',
  storeId,
  onToggleManualEntry,
  onManualProductSelected,
  onCloseManualEntry,
  isBackendHealthy,
  autoStart = true,
}: ScanningCameraProps) {
  // Get appropriate title based on mode
  const cameraTitle =
    title || (mode === 'barcode' ? 'Scan Product' : 'Scan Expiry Date')
  const cameraSubtitle =
    subtitle ||
    (mode === 'barcode'
      ? 'Point camera at barcode'
      : 'Point camera at expiry date')
  const permissionMessage =
    mode === 'barcode'
      ? 'Camera access is required for barcode scanning.'
      : 'Camera access is required for capturing expiry dates.'

  return (
    <div className={cn(className, 'space-y-4')}>
      {/* Camera Scanner */}
      <div className="space-y-2">
        <BarcodeScanner
          onScan={
            mode === 'barcode' && onBarcodeScanned ? onBarcodeScanned : () => {}
          }
          onError={onScanError || (() => {})}
          autoStart={autoStart}
          title={cameraTitle}
          subtitle={cameraSubtitle}
          permissionMessage={permissionMessage}
        />
      </div>

      {/* OCR Mode - Capture Button and Error Display */}
      {mode === 'ocr' && (
        <>
          {/* OCR Error Display */}
          {ocrError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                OCR Error: {ocrError}
                {isBackendHealthy === false && (
                  <span className="block mt-1 text-xs">
                    FastAPI backend is not available. Please use manual entry.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Backend Health Warning */}
          {isBackendHealthy === false && !ocrError && (
            <Alert
              variant="default"
              className="border-none flex justify-center"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                OCR service is currently unavailable. Please use manual date
                entry.
              </AlertDescription>
            </Alert>
          )}

          {/* OCR Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={onOCRCapture}
              className="flex-1 "
              disabled={isOCRProcessing || isBackendHealthy === false}
            >
              <Camera className="w-4 h-4 mr-2" />
              {isOCRProcessing ? 'Processing OCR...' : 'Capture Expiry Date'}
            </Button>
            {ocrError && onClearOCRError && (
              <Button
                onClick={onClearOCRError}
                variant="outline"
                size="sm"
              >
                Clear Error
              </Button>
            )}
          </div>
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
              <Button
                variant="outline"
                onClick={onToggleManualEntry}
                className="flex-1"
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Manual Entry
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
          <AlertDescription>
            Point your camera at any product barcode. The scanner will
            automatically detect supported formats and look up product
            information from Open Food Facts.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
