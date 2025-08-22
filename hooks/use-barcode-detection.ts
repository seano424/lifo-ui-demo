// hooks/use-barcode-detection.ts
import { useCallback, useRef, useState } from 'react'
import { UniversalBarcodeDetector } from '@/lib/barcode/barcode-detector'

export function useBarcodeDetection() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const detectorRef = useRef<UniversalBarcodeDetector | null>(null)

  const initializeDetector = useCallback(async () => {
    try {
      setError(null)
      detectorRef.current = new UniversalBarcodeDetector([
        'ean_13',
        'ean_8',
        'code_128',
        'code_39',
        'code_93',
      ])
      await detectorRef.current.initialize()
      setIsInitialized(true)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to initialize barcode detector'
      setError(errorMessage)
      console.error('Barcode detector initialization failed:', err)
    }
  }, [])

  const detectBarcodes = useCallback(
    async (imageSource: ImageData | HTMLCanvasElement | HTMLVideoElement) => {
      if (!detectorRef.current) {
        await initializeDetector()
      }

      if (!detectorRef.current) {
        throw new Error('Barcode detector not available')
      }

      return await detectorRef.current.detect(imageSource)
    },
    [initializeDetector],
  )

  return {
    isInitialized,
    error,
    initializeDetector,
    detectBarcodes,
  }
}

// Updated scanner component integration
export function useUpdatedBarcodeScanner() {
  const { detectBarcodes, initializeDetector, isInitialized } = useBarcodeDetection()

  const scanForBarcode = useCallback(
    async (
      videoRef: React.RefObject<HTMLVideoElement>,
      canvasRef: React.RefObject<HTMLCanvasElement>,
    ) => {
      if (!videoRef.current || !canvasRef.current) return null

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return null

      // Set canvas size to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      try {
        // Use real barcode detection
        const detections = await detectBarcodes(canvas)
        return detections.length > 0 ? detections[0] : null
      } catch (error) {
        console.error('Barcode scanning error:', error)
        return null
      }
    },
    [detectBarcodes],
  )

  return {
    scanForBarcode,
    initializeDetector,
    isInitialized,
  }
}
