'use client'

import { AlertCircle, Camera } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface DeliveryNoteFullscreenCameraProps {
  onCapture: (imageData: string) => void
  onError?: (error: Error) => void
  isCapturing?: boolean
}

export function DeliveryNoteFullscreenCamera({
  onCapture,
  onError,
  isCapturing = false,
}: DeliveryNoteFullscreenCameraProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isStartingRef = useRef(false)

  // Mark component as mounted
  useEffect(() => {
    setIsMounted(true)
    return () => {
      setIsMounted(false)
    }
  }, [])

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.load()
    }

    setIsStreaming(false)
    isStartingRef.current = false
  }, [])

  // Start camera stream
  const startCamera = useCallback(async () => {
    if (isStartingRef.current || isStreaming || !isMounted) {
      return
    }

    isStartingRef.current = true

    try {
      setError(null)

      // Stop any existing stream first
      if (streamRef.current) {
        stopCamera()
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Try multiple constraint configurations for device compatibility
      let stream: MediaStream | null = null
      const constraints = [
        // Attempt 1: Back camera with ideal dimensions (works on phones)
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        // Attempt 2: Any camera with ideal dimensions (fallback for iPads)
        {
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        // Attempt 3: Basic video only (maximum compatibility)
        { video: true },
      ]

      let lastError: Error | null = null
      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint)
          break // Success - exit loop
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          // Continue to next constraint
        }
      }

      if (!stream) {
        throw lastError || new Error('Failed to access camera with any constraints')
      }

      // Check if component is still mounted
      if (!isMounted) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      streamRef.current = stream
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        videoRef.current.onloadedmetadata = () => {
          if (isMounted) {
            videoRef.current?.play()
            setIsStreaming(true)
          }
        }
      }
    } catch (err) {
      let errorMessage = 'Failed to access camera'
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage =
            'Camera permission denied. Please enable camera access in your browser settings.'
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera detected on this device.'
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Camera constraints not supported by your device.'
        } else {
          errorMessage = `Camera error: ${err.message}`
        }
      }
      setError(errorMessage)
      setHasPermission(false)
      onError?.(new Error(errorMessage))
    } finally {
      isStartingRef.current = false
    }
  }, [onError, isStreaming, isMounted, stopCamera])

  // Capture photo from video stream
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      return
    }

    // Set canvas size to match video dimensions
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current video frame to canvas
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Get image data as base64
      const imageData = canvas.toDataURL('image/jpeg', 0.95)
      onCapture(imageData)
    }
  }, [isStreaming, onCapture])

  // Auto-start camera
  useEffect(() => {
    if (isMounted && !isStartingRef.current && !isStreaming && hasPermission !== false) {
      startCamera()
    }
  }, [isMounted, startCamera, isStreaming, hasPermission])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // Expose capture method to parent
  useEffect(() => {
    if (isCapturing && isStreaming) {
      capturePhoto()
    }
  }, [isCapturing, isStreaming, capturePhoto])

  return (
    <div className="relative w-full h-full bg-black">
      {/* Error Display */}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/80">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Camera Permission Request */}
      {hasPermission === false && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
          <div className="text-center space-y-4 p-6">
            <Camera className="h-12 w-12 text-white mx-auto" />
            <p className="text-white text-lg">Camera access required</p>
            <Button onClick={startCamera} disabled={isStartingRef.current} variant="secondary">
              <Camera className="w-4 h-4 mr-2" />
              {isStartingRef.current ? 'Requesting access...' : 'Enable Camera'}
            </Button>
          </div>
        </div>
      )}

      {/* Camera Video */}
      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Loading state */}
      {!isStreaming && hasPermission !== false && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-white text-center">
            <Camera className="h-12 w-12 mx-auto mb-4 animate-pulse" />
            <p>Starting camera...</p>
          </div>
        </div>
      )}
    </div>
  )
}
