'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, ScanLine, AlertCircle, X, Keyboard, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBarcodeDetection } from '@/hooks/use-barcode-detection'

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
}

export default function BarcodeScanner({
  onScan,
  onError,
  autoStart = true,
  className = '',
}: BarcodeScannerProps): React.JSX.Element {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null)
  const [scanningHistory, setScanningHistory] = useState<string[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const [userStoppedCamera, setUserStoppedCamera] = useState(false) // 🔥 Tracks if user manually stopped

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isStartingRef = useRef(false) // Prevent multiple simultaneous camera starts

  // 🔥 REAL barcode detection using your infrastructure
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

  // Real barcode detection function (replaces mock)
  const detectBarcode = useCallback(
    async (imageData: ImageData): Promise<BarcodeDetection | null> => {
      try {
        // Use your real barcode detection infrastructure
        const detections = await detectBarcodes(canvasRef.current!)
        return detections.length > 0 ? detections[0] : null
      } catch (error) {
        console.error('Barcode detection failed:', error)
        return null
      }
    },
    [detectBarcodes],
  )

  // Stop camera stream - IMPROVED
  const stopCamera = useCallback(() => {
    console.log('Stopping camera...')

    // Stop the media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind, track.readyState)
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

    console.log('Camera stopped successfully')
  }, [])

  // Start camera stream - IMPROVED with better state management
  const startCamera = useCallback(async () => {
    // 🔥 FIXED: More comprehensive blocking conditions
    if (
      isStartingRef.current ||
      isScanning ||
      !isMounted ||
      userStoppedCamera || // 🔥 KEY FIX: Respect user's intent to stop
      !isInitialized
    ) {
      console.log('Camera start blocked:', {
        isStarting: isStartingRef.current,
        isScanning,
        isMounted,
        userStoppedCamera, // 🔥 Now logged
        isInitialized,
      })
      return
    }

    console.log('Starting camera...')
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
            // 🔥 Double-check user intent
            videoRef.current?.play()
            setIsScanning(true)
            console.log('Camera started successfully')
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera'
      console.error('Camera start failed:', errorMessage)
      setError(errorMessage)
      setHasPermission(false)
      onError?.(new Error(errorMessage))
    } finally {
      isStartingRef.current = false
    }
  }, [onError, isScanning, isMounted, stopCamera, userStoppedCamera, isInitialized]) // 🔥 Added userStoppedCamera to dependencies

  // Scan for barcodes in video feed using REAL detection
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
      // 🔥 Use REAL barcode detection instead of mock
      const detections = await detectBarcodes(canvas)

      if (detections.length > 0 && isMounted) {
        const detection = detections[0]
        setDetectedBarcode(detection.rawValue)

        // Auto-confirm after brief display
        setTimeout(() => {
          if (isMounted) {
            handleBarcodeDetected(detection.rawValue, detection)
          }
        }, 1000)
      }
    } catch (error) {
      console.error('Barcode detection failed:', error)
      // Don't spam errors, just continue scanning
    }
  }, [isScanning, isInitialized, detectBarcodes, isMounted])

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

  // Handle manual barcode entry
  const handleManualSubmit = useCallback(
    (e: React.FormEvent | React.KeyboardEvent) => {
      e.preventDefault()
      if (manualBarcode.trim() && isMounted) {
        handleBarcodeDetected(manualBarcode.trim(), {
          format: 'Manual Entry',
          rawValue: manualBarcode.trim(),
          confidence: 1.0,
        })
        setManualBarcode('')
        setShowManualEntry(false)
      }
    },
    [manualBarcode, handleBarcodeDetected, isMounted],
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

  // Initialize barcode detector - SINGLE EFFECT
  useEffect(() => {
    if (!isInitialized && isMounted) {
      console.log('Initializing barcode detector...')
      initializeDetector()
    }
  }, [isInitialized, initializeDetector, isMounted])

  // 🔥 FIXED: Auto-start camera - Auto-start initially, then respect user stops
  useEffect(() => {
    if (
      autoStart &&
      isInitialized &&
      isMounted &&
      !isStartingRef.current &&
      !isScanning &&
      !userStoppedCamera && // 🔥 KEY: Don't auto-start if user manually stopped
      hasPermission !== false // Don't try if permission was denied
    ) {
      console.log('Auto-starting camera...')
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

  // 🔥 FIXED: Handle user manually stopping the camera
  const handleUserStop = useCallback(() => {
    console.log('User manually stopped camera')
    setUserStoppedCamera(true) // 🔥 This prevents auto-restart
    stopCamera()
  }, [stopCamera])

  // 🔥 FIXED: Handle user manually starting the camera
  const handleUserStart = useCallback(() => {
    console.log('User manually started camera')
    setUserStoppedCamera(false) // 🔥 Clear the stop flag
    startCamera()
  }, [startCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting, cleaning up...')
      stopCamera()
    }
  }, [stopCamera])

  // Show detection error if any
  const displayError = error || detectionError

  return (
    <div className={`barcode-scanner ${className}`}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5" />
            Barcode Scanner
            {isInitialized && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Real Detection
              </span>
            )}
            {isScanning && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Scanning</span>
            )}
            {/* 🔥 DEBUG: Show user stop status */}
            {userStoppedCamera && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                User Stopped
              </span>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
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

          {/* Camera Permission Request */}
          {hasPermission === false && (
            <div className="text-center space-y-4">
              <Alert>
                <Camera className="h-4 w-4" />
                <AlertDescription>Camera access is required for barcode scanning.</AlertDescription>
              </Alert>
              <Button
                onClick={handleUserStart} // 🔥 Use handleUserStart
                className="w-full"
                disabled={!isInitialized || isStartingRef.current}
              >
                <Camera className="w-4 h-4 mr-2" />
                {isStartingRef.current ? 'Starting...' : 'Enable Camera'}
              </Button>
            </div>
          )}

          {/* Camera View */}
          {hasPermission && !showManualEntry && (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full aspect-video bg-black rounded-lg object-cover"
                playsInline
                muted
              />

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
            </div>
          )}

          {/* Manual Entry Form */}
          {showManualEntry && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Enter Barcode Manually</label>
                <Input
                  type="text"
                  value={manualBarcode}
                  onChange={e => setManualBarcode(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && manualBarcode.trim()) {
                      handleManualSubmit(e)
                    }
                  }}
                  placeholder="Enter barcode number..."
                  className="font-mono"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleManualSubmit}
                  disabled={!manualBarcode.trim()}
                  className="flex-1"
                >
                  Confirm
                </Button>
                <Button variant="outline" onClick={() => setShowManualEntry(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* 🔥 FIXED: Action Buttons - Clear logic for start/stop */}
          {hasPermission && !showManualEntry && (
            <div className="flex gap-2">
              {!isScanning ? (
                <Button
                  onClick={handleUserStart} // 🔥 Use handleUserStart
                  className="flex-1"
                  disabled={!isInitialized || isStartingRef.current}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {isStartingRef.current ? 'Starting...' : 'Start Scanning'}
                </Button>
              ) : (
                <Button
                  onClick={handleUserStop} // 🔥 Use handleUserStop
                  variant="outline"
                  className="flex-1"
                >
                  Stop Scanning
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => setShowManualEntry(true)}
                title="Manual entry"
              >
                <Keyboard className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Scanning History */}
          {scanningHistory.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-600">Recent Scans</h4>
              <div className="space-y-1">
                {scanningHistory.map((barcode, index) => (
                  <div
                    key={`${barcode}-${index}`}
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
          {hasPermission && isScanning && isInitialized && (
            <div className="text-xs text-gray-500 text-center">
              Point camera at barcode to scan automatically • Real detection active
            </div>
          )}

          {/* 🔥 DEBUG INFO - Remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-400 p-2 bg-gray-50 rounded">
              Debug: userStopped={userStoppedCamera.toString()}, isScanning={isScanning.toString()},
              autoStart={autoStart.toString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
