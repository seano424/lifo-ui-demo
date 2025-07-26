// lib/barcode/barcode-detector.ts
import { BarcodeDetection } from '@/components/barcode/barcode-scanner'

// Define a more flexible type that matches the actual library
type BarcodeFormat = string

// Define proper types for the barcode detector
interface BarcodeDetectorConstructor {
  new (options: { formats: BarcodeFormat[] }): BarcodeDetector
  getSupportedFormats(): Promise<readonly BarcodeFormat[]>
}

interface BarcodeDetector {
  detect(imageSource: ImageData | HTMLCanvasElement | HTMLVideoElement): Promise<BarcodeResult[]>
}

interface BarcodeResult {
  format: BarcodeFormat
  rawValue: string
  confidence?: number
}

// Polyfill for browsers without native support
let BarcodeDetectorPolyfill: BarcodeDetectorConstructor | null = null

async function loadBarcodeDetectorPolyfill(): Promise<BarcodeDetectorConstructor> {
  if (!BarcodeDetectorPolyfill) {
    const barcodeModule = await import('barcode-detector')
    BarcodeDetectorPolyfill = barcodeModule.BarcodeDetector as BarcodeDetectorConstructor
  }
  return BarcodeDetectorPolyfill!
}

export class UniversalBarcodeDetector {
  private detector: BarcodeDetector | null = null
  private isNative: boolean = false

  constructor(private formats: BarcodeFormat[] = ['ean_13', 'ean_8', 'code_128', 'code_39']) {}

  async initialize(): Promise<void> {
    try {
      // Try native BarcodeDetector API first (Chrome/Edge)
      if ('BarcodeDetector' in globalThis) {
        this.detector = new (
          globalThis as unknown as { BarcodeDetector: BarcodeDetectorConstructor }
        ).BarcodeDetector({
          formats: this.formats,
        })
        this.isNative = true
        console.log('Using native BarcodeDetector API')
      } else {
        // Fallback to ZXing WebAssembly polyfill
        const BarcodeDetectorClass = await loadBarcodeDetectorPolyfill()
        this.detector = new BarcodeDetectorClass({
          formats: this.formats,
        })
        this.isNative = false
        console.log('Using ZXing WebAssembly polyfill')
      }
    } catch (error) {
      console.error('Failed to initialize barcode detector:', error)
      throw new Error('Barcode detection not supported')
    }
  }

  async detect(
    imageSource: ImageData | HTMLCanvasElement | HTMLVideoElement,
  ): Promise<BarcodeDetection[]> {
    if (!this.detector) {
      await this.initialize()
    }

    try {
      const barcodes = await this.detector!.detect(imageSource)

      return barcodes.map((barcode: BarcodeResult) => ({
        format: barcode.format,
        rawValue: barcode.rawValue,
        confidence: this.isNative ? 0.95 : 0.85, // Native API typically more accurate
      }))
    } catch (error) {
      console.error('Barcode detection failed:', error)
      return []
    }
  }

  static async getSupportedFormats(): Promise<string[]> {
    try {
      if ('BarcodeDetector' in globalThis) {
        const formats = await (
          globalThis as unknown as { BarcodeDetector: BarcodeDetectorConstructor }
        ).BarcodeDetector.getSupportedFormats()
        return Array.from(formats)
      } else {
        const BarcodeDetectorClass = await loadBarcodeDetectorPolyfill()
        const formats = await BarcodeDetectorClass.getSupportedFormats()
        return Array.from(formats)
      }
    } catch (error) {
      console.error('Failed to get supported formats:', error)
      return ['ean_13', 'ean_8', 'code_128', 'code_39'] // Fallback formats
    }
  }
}
