'use client'

import { Camera, FileImage, Upload } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { OCR_CONFIG } from '@/lib/api/ocr-config'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

interface ImageUploadZoneProps {
  onImageSelected: (file: File) => void
  onCameraOpen?: () => void
  disabled?: boolean
}

export function ImageUploadZone({
  onImageSelected,
  onCameraOpen,
  disabled = false,
}: ImageUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const isMobile = useIsMobile()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files?.[0]) {
      onImageSelected(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImageSelected(file)
    }
  }

  const fileInputId = 'delivery-note-file-input'

  return (
    <Card className="p-6">
      <div
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center transition-colors',
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
          !disabled && 'hover:border-gray-400 cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById(fileInputId)?.click()}
      >
        <input
          id={fileInputId}
          type="file"
          accept={OCR_CONFIG.supportedExtensions.join(',')}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        <div className="space-y-4">
          <FileImage className="h-12 w-12 text-primary-400 mx-auto" />
          <div>
            <h3 className="font-semibold text-lg">Upload delivery note image</h3>
            <p className="text-gray-600 text-sm mt-1">Drag and drop or click to select an image</p>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Supported formats: {OCR_CONFIG.supportedExtensions.join(', ')}</p>
            <p>Maximum file size: {OCR_CONFIG.maxFileSize / 1024 / 1024}MB</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center">
            <Button
              type="button"
              onClick={e => {
                e.stopPropagation()
                document.getElementById(fileInputId)?.click()
              }}
              variant="outline"
              disabled={disabled}
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>

            {/* Camera button - Mobile only */}
            {isMobile && onCameraOpen && (
              <Button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  onCameraOpen()
                }}
                variant="outline"
                disabled={disabled}
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
