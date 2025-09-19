import { ContentCard, SupportPageWrapper } from '@/components/support'
import { AlertTriangle, Camera, Package, ScanLine } from 'lucide-react'

const scanInSteps = [
  { number: 1, description: 'Navigate to "Scan In" from the main dashboard' },
  { number: 2, description: "Select the delivery or batch you're processing" },
  { number: 3, description: 'Scan product barcodes or enter manually' },
  { number: 4, description: 'Verify product details and quantities' },
  { number: 5, description: 'Confirm and save the batch' },
]

const newProductFeatures = [
  { problem: 'Product Information', solution: 'Fill in product name and description' },
  { problem: 'Categories & Attributes', solution: 'Set category and any custom attributes' },
  { problem: 'Product Images', solution: 'Add product images if available' },
  { problem: 'Pricing', solution: 'Set pricing information' },
]

const troubleshootingItems = [
  {
    problem: "Barcode Won't Scan",
    solution: 'Clean the barcode, improve lighting, or enter manually',
  },
  { problem: 'Wrong Product', solution: 'Check if there are multiple barcodes on the packaging' },
  { problem: 'Quantity Mismatch', solution: 'Double-check physical count against system records' },
  { problem: 'Duplicate Entries', solution: 'Use the batch review feature to identify duplicates' },
]

export default function ScanInProcessPage() {
  return (
    <SupportPageWrapper
      title="Scan-In Process"
      description="Master the scan-in workflow for adding products to your inventory"
      readTime="4 min read"
      intro="The scan-in process is the foundation of inventory management in LIFO. Use this process when receiving deliveries, returns, or adding new inventory."
    >
      <div className="space-y-6">
        <ContentCard
          title="Basic Scan-In Steps"
          icon={ScanLine}
          variant="steps"
          steps={scanInSteps}
        />

        <ContentCard
          title="Adding New Products"
          description="When scanning unknown barcodes, LIFO will prompt you to create a new product:"
          icon={Package}
          variant="troubleshooting"
          troubleshootingItems={newProductFeatures}
        />

        <ContentCard
          title="Image Recognition"
          description="LIFO can recognize products from images when barcodes are damaged or missing. Simply take a photo of the product and the system will suggest matches."
          icon={Camera}
          variant="simple"
        />

        <ContentCard
          title="Troubleshooting"
          icon={AlertTriangle}
          variant="troubleshooting"
          troubleshootingItems={troubleshootingItems}
        />
      </div>
    </SupportPageWrapper>
  )
}
