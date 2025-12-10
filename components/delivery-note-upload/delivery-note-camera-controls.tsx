'use client'

import { Camera, Image as ImageIcon, X } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { OCR_CONFIG } from '@/lib/api/ocr-config'
import { cn } from '@/lib/utils'

interface DeliveryNoteCameraControlsProps {
  onCapture: () => void
  onCancel: () => void
  onImport: (file: File) => void
  disabled?: boolean
  isCapturing?: boolean
}

export function DeliveryNoteCameraControls({
  onCapture,
  onCancel,
  onImport,
  disabled = false,
  isCapturing = false,
}: DeliveryNoteCameraControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImport(file)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      {/* Hidden file input for gallery import */}
      <input
        ref={fileInputRef}
        type="file"
        accept={OCR_CONFIG.supportedExtensions.join(',')}
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      {/* Top controls - Cancel button */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent">
        <Button
          onClick={onCancel}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          disabled={disabled || isCapturing}
        >
          <X className="h-6 w-6" />
          <span className="sr-only">Cancel</span>
        </Button>
      </div>

      {/* Bottom controls - Import and Capture buttons */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
        <div className="flex items-center justify-between px-6 py-8">
          {/* Import button - Left */}
          <Button
            onClick={handleImportClick}
            variant="ghost"
            size="icon"
            className={cn(
              'text-white hover:bg-white/20 h-14 w-14 rounded-full',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
            disabled={disabled || isCapturing}
          >
            <ImageIcon className="h-6 w-6" />
            <span className="sr-only">Import from gallery</span>
          </Button>

          {/* Capture button - Center */}
          <Button
            onClick={onCapture}
            variant="ghost"
            size="icon"
            className={cn(
              'h-20 w-20 rounded-full bg-white hover:bg-gray-200 transition-all',
              'border-4 border-white shadow-xl',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isCapturing && 'scale-90',
            )}
            disabled={disabled || isCapturing}
          >
            <div
              className={cn(
                'h-16 w-16 rounded-full bg-gradient-to-b from-primary-500 to-primary-700',
                isCapturing && 'animate-pulse',
              )}
            >
              <Camera className="h-8 w-8 text-white m-auto translate-y-4" />
            </div>
            <span className="sr-only">Capture photo</span>
          </Button>

          {/* Spacer for symmetry - Right */}
          <div className="h-14 w-14" />
        </div>
      </div>
    </>
  )
}
