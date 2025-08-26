'use client'

import { AlertCircle, Camera, CheckCircle, Scan, StopCircle } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { useBarcodeDetection } from '@/hooks/use-barcode-detection'
import { cn } from '@/lib/utils'

export interface BarcodeDetection {
  format: string
  rawValue: string
  confidence?: number
}

interface BarcodeScannerProps {
  onScan: (barcode: string, detection?: BarcodeDetection) => void
  onError?: (error: Error) => void
  autoStart?: boolean
  className?: string
  title?: string
  subtitle?: string
  isBarcodeScanner?: boolean
}

export default function BarcodeScanner({
  onScan,
  onError,
  autoStart = true,
  className = '',
  title = 'Scan Product',
  subtitle = 'Scan a barcode to add a product to your inventory',
  isBarcodeScanner = false,
}: BarcodeScannerProps): React.JSX.Element {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null)
  const [scanningHistory, setScanningHistory] = useState<string[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const [userStoppedCamera, setUserStoppedCamera] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isStartingRef = useRef(false) // Prevent multiple simultaneous camera starts

  const {
    detectBarcodes,
    initializeDetector,
    isInitialized,
    error: detectionError,
  } = useBarcodeDetection()

  // Mark component as mounted
  useEffect(() => {
    setIsMounted(true)
    return () => {
      setIsMounted(false)
    }
  }, [])

  // Stop camera stream
  const stopCamera = useCallback(() => {
    // Stop the media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }

    // Clear the video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.load() // Reset video element
    }

    // Clear scanning interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    // Reset all scanning state
    setIsScanning(false)
    setDetectedBarcode(null)
    isStartingRef.current = false
  }, [])

  // Start camera stream
  const startCamera = useCallback(async () => {
    if (isStartingRef.current || isScanning || !isMounted || userStoppedCamera || !isInitialized) {
      return
    }

    isStartingRef.current = true

    try {
      setError(null)

      // Stop any existing stream first
      if (streamRef.current) {
        stopCamera()
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      // Check if component is still mounted and user hasn't stopped
      if (!isMounted || userStoppedCamera) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      streamRef.current = stream
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        // Wait for video to be ready before marking as scanning
        videoRef.current.onloadedmetadata = () => {
          if (isMounted && !userStoppedCamera) {
            videoRef.current?.play()
            setIsScanning(true)
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera'
      setError(errorMessage)
      setHasPermission(false)
      onError?.(new Error(errorMessage))
    } finally {
      isStartingRef.current = false
    }
  }, [onError, isScanning, isMounted, stopCamera, userStoppedCamera, isInitialized])

  // Scan for barcodes in video feed
  const scanForBarcode = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isScanning || !isInitialized || !isMounted) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      const detections = await detectBarcodes(canvas)

      if (detections.length > 0 && isMounted) {
        const detection = detections[0]
        setDetectedBarcode(detection.rawValue)

        // Auto-confirm after brief display
        setTimeout(() => {
          if (isMounted) {
            // Call handleBarcodeDetected directly with current values
            const barcode = detection.rawValue
            setScanningHistory(prev => [barcode, ...prev.slice(0, 4)])
            setDetectedBarcode(null)
            onScan(barcode, detection)

            // Continue scanning after brief pause
            setTimeout(() => {
              if (isMounted) {
                setDetectedBarcode(null)
              }
            }, 500)
          }
        }, 1000)
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Barcode detection error:', error.message)
      }
      // Don't spam errors, just continue scanning
    }
  }, [isScanning, isInitialized, detectBarcodes, isMounted, onScan])

  // Handle successful barcode detection
  const handleBarcodeDetected = useCallback(
    (barcode: string, detection?: BarcodeDetection) => {
      if (!isMounted) return

      setScanningHistory(prev => [barcode, ...prev.slice(0, 4)])
      setDetectedBarcode(null)
      onScan(barcode, detection)

      // Continue scanning after brief pause
      setTimeout(() => {
        if (isMounted) {
          setDetectedBarcode(null)
        }
      }, 500)
    },
    [onScan, isMounted],
  )

  // Set up scanning interval
  useEffect(() => {
    if (isScanning && isInitialized && isMounted) {
      scanIntervalRef.current = setInterval(scanForBarcode, 200) // Scan every 200ms for real detection
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
    }
  }, [isScanning, isInitialized, scanForBarcode, isMounted])

  // Initialize barcode detector
  useEffect(() => {
    if (!isInitialized && isMounted) {
      initializeDetector()
    }
  }, [isInitialized, initializeDetector, isMounted])

  // Auto-start camera
  useEffect(() => {
    if (
      autoStart &&
      isInitialized &&
      isMounted &&
      !isStartingRef.current &&
      !isScanning &&
      !userStoppedCamera &&
      hasPermission !== false
    ) {
      startCamera()
    }
  }, [
    autoStart,
    isInitialized,
    isMounted,
    startCamera,
    isScanning,
    userStoppedCamera,
    hasPermission,
  ])

  // Handle user manually stopping the camera
  const handleUserStop = useCallback(() => {
    setUserStoppedCamera(true)
    stopCamera()
  }, [stopCamera])

  // Handle user manually starting the camera
  const handleUserStart = useCallback(() => {
    setUserStoppedCamera(false)
    startCamera()
  }, [startCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // Show detection error if any
  const displayError = error || detectionError

  return (
    <div className={cn('w-full text-center sm:min-w-[600px] flex flex-col gap-4', className)}>
      <div className="flex items-center gap-2 flex-col justify-center">
        <div className="flex items-center gap-2">
          <Scan className="w-6 h-6  text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
          <Typography variant="h3" className="text-primary-800 font-black">
            {title}
          </Typography>
        </div>
        <Typography variant="p">{subtitle}</Typography>
      </div>

      <div className="space-y-4">
        {/* Error Display */}
        {displayError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}

        {/* Initialization Status */}
        {!isInitialized && !detectionError && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Initializing barcode detection...</AlertDescription>
          </Alert>
        )}

        {/* Camera container - ALWAYS maintains aspect ratio */}
        <div className="relative w-full aspect-video border border-black rounded-3xl bg-gray-100">
          {/* Camera Permission Request */}
          {(hasPermission === false || hasPermission === null) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-3xl">
              <div className="text-center space-y-4">
                <Alert className="border-none bg-transparent shadow-none">
                  <Camera className="h-4 w-4" />
                  <AlertDescription>
                    Camera access is required for barcode scanning.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={handleUserStart}
                  disabled={!isInitialized || isStartingRef.current}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {isStartingRef.current ? 'Starting...' : 'Enable Camera'}
                </Button>
              </div>
            </div>
          )}

          {/* Camera Video */}
          {hasPermission && (
            <>
              <video
                ref={videoRef}
                className="w-full h-full aspect-video rounded-3xl object-cover"
                playsInline
                muted
              />

              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Typography variant="p">Start scanning to see your camera</Typography>
                </div>
              )}

              {/* Scanning overlay */}
              {isScanning && isInitialized && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-green-400 w-64 h-32 rounded-lg relative">
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 transform -translate-y-1/2 animate-pulse" />
                    {detectedBarcode && (
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-2 py-1 rounded text-sm">
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        Detected: {detectedBarcode}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hidden canvas for barcode detection */}
              <canvas ref={canvasRef} className="hidden" />
            </>
          )}
        </div>

        {hasPermission && (
          <div className="flex gap-2">
            {!isScanning ? (
              <Button
                onClick={handleUserStart}
                className="flex-1"
                variant="secondary"
                disabled={!isInitialized || isStartingRef.current}
              >
                <Camera className="w-4 h-4 mr-2" />
                {isStartingRef.current ? 'Starting...' : 'Start Scanning'}
              </Button>
            ) : (
              <Button onClick={handleUserStop} variant="destructive" className="flex-1">
                <StopCircle className="w-4 h-4 mr-2" />
                Stop Scanning
              </Button>
            )}
          </div>
        )}

        {/* Scanning History */}
        {scanningHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600">Recent Scans</h4>
            <div className="space-y-1">
              {scanningHistory.map((barcode, index) => (
                <div
                  key={`scan-${barcode}-${Date.now()}-${index}`}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                >
                  <span className="font-mono">{barcode}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleBarcodeDetected(barcode)}
                    className="h-6 px-2 text-xs"
                  >
                    Re-scan
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {hasPermission && isScanning && isInitialized && isBarcodeScanner && (
          <div className="text-xs text-gray-500 text-center">
            Point camera at barcode to scan automatically • Real detection active
          </div>
        )}
      </div>
    </div>
  )
}
