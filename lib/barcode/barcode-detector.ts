// lib/barcode/barcode-detector.ts
import { BarcodeDetection } from '@/components/barcode/barcode-scanner'

// Polyfill for browsers without native support
let BarcodeDetectorPolyfill: any = null

async function loadBarcodeDetectorPolyfill() {
  if (!BarcodeDetectorPolyfill) {
    const module = await import('barcode-detector')
    BarcodeDetectorPolyfill = module.BarcodeDetector
  }
  return BarcodeDetectorPolyfill
}

export class UniversalBarcodeDetector {
  private detector: any = null
  private isNative: boolean = false

  constructor(private formats: string[] = ['ean_13', 'ean_8', 'code_128', 'code_39']) {}

  async initialize(): Promise<void> {
    try {
      // Try native BarcodeDetector API first (Chrome/Edge)
      if ('BarcodeDetector' in globalThis) {
        this.detector = new (globalThis as any).BarcodeDetector({
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
      const barcodes = await this.detector.detect(imageSource)

      return barcodes.map((barcode: any) => ({
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
        return await (globalThis as any).BarcodeDetector.getSupportedFormats()
      } else {
        const BarcodeDetectorClass = await loadBarcodeDetectorPolyfill()
        return await BarcodeDetectorClass.getSupportedFormats()
      }
    } catch (error) {
      console.error('Failed to get supported formats:', error)
      return ['ean_13', 'ean_8', 'code_128', 'code_39'] // Fallback formats
    }
  }
}
