'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { DeliveryNoteFullscreenCamera } from './delivery-note-fullscreen-camera'
import { DeliveryNoteCameraControls } from './delivery-note-camera-controls'
import { toast } from 'sonner'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'

interface DeliveryNoteCameraModalProps {
  open: boolean
  onClose: () => void
  onImageSelected: (file: File) => void
}

export function DeliveryNoteCameraModal({
  open,
  onClose,
  onImageSelected,
}: DeliveryNoteCameraModalProps) {
  const [isCapturing, setIsCapturing] = useState(false)

  // Convert base64 image data to File
  const dataURLtoFile = useCallback((dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',')
    const mimeMatch = arr[0].match(/:(.*?);/)
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
  }, [])

  // Handle photo capture
  const handleCapture = useCallback(
    (imageData: string) => {
      try {
        setIsCapturing(false)
        const file = dataURLtoFile(imageData, `delivery-note-${Date.now()}.jpg`)
        onImageSelected(file)
        onClose()
        toast.success('Photo captured!', {
          description: 'Processing with OCR...',
        })
      } catch (error) {
        console.error('Error converting image:', error)
        toast.error('Failed to capture photo', {
          description: 'Please try again',
        })
        setIsCapturing(false)
      }
    },
    [dataURLtoFile, onImageSelected, onClose],
  )

  // Handle capture button click
  const handleCaptureClick = useCallback(() => {
    setIsCapturing(true)
  }, [])

  // Handle import from gallery
  const handleImport = useCallback(
    (file: File) => {
      onImageSelected(file)
      onClose()
      toast.success('Image selected!', {
        description: 'Processing with OCR...',
      })
    },
    [onImageSelected, onClose],
  )

  // Handle camera errors
  const handleCameraError = useCallback((error: Error) => {
    console.error('Camera error:', error)
    toast.error('Camera error', {
      description: error.message,
    })
  }, [])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="bg-black" />
        <DialogContent
          className="w-screen h-dvh max-w-none rounded-none p-0 m-0 border-0 bg-black"
          showCloseButton={false}
        >
          <VisuallyHidden.Root>
            <DialogTitle>Capture Delivery Note</DialogTitle>
          </VisuallyHidden.Root>

          {/* Fullscreen camera view */}
          <DeliveryNoteFullscreenCamera
            onCapture={handleCapture}
            onError={handleCameraError}
            isCapturing={isCapturing}
          />

          {/* Camera controls overlay */}
          <DeliveryNoteCameraControls
            onCapture={handleCaptureClick}
            onCancel={onClose}
            onImport={handleImport}
            isCapturing={isCapturing}
          />
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
