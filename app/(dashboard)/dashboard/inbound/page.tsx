import BarcodeScannerDemo from '@/components/barcode/barcode-demo'
import StreamlinedScanningInterface from '@/components/scanning/streamlined-scanning-interface'
// import BarcodeScannerDemoSimple from '@/components/barcode/barcode-demo-simple'

export default function InboundPage() {
  return (
    <div className="max-w-screen-sm mx-auto">
      {/* <BarcodeScannerDemo /> */}
      <StreamlinedScanningInterface />
    </div>
  )
}
