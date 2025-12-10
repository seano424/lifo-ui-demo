'use client'

import { Camera, Clock, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { useDeliveryNoteUpload } from '@/hooks/use-delivery-note-upload'
import { PRICE_CONSTRAINTS } from '@/lib/constants/file-upload'
import { BatchValidationTable } from '@/components/batch-validation/batch-validation-table'
import { UploadResultsDisplay } from '@/components/batch-validation/upload-results-display'
import type { CsvPreviewItem } from '@/components/batch-validation'
import { ImageUploadZone } from './image-upload-zone'
import { OCRProcessingState } from './ocr-processing-state'
import { DeliveryNoteCameraModal } from './delivery-note-camera-modal'

interface DeliveryNoteUploadFormProps {
  storeId: string
}

export function DeliveryNoteUploadForm({ storeId }: DeliveryNoteUploadFormProps) {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [showCameraModal, setShowCameraModal] = useState(false)

  const deliveryNoteUpload = useDeliveryNoteUpload()
  const itemsPerPage = 10

  // Memoize pricing validation
  const hasInvalidPricing = useMemo(() => {
    if (deliveryNoteUpload.items.length === 0) return false

    return deliveryNoteUpload.items.some(
      item =>
        item.Cost_Price < PRICE_CONSTRAINTS.MIN_PRICE ||
        item.Selling_Price < PRICE_CONSTRAINTS.MIN_PRICE,
    )
  }, [deliveryNoteUpload.items])

  // Handle image upload and OCR processing
  const handleImageSelect = async (file: File) => {
    setUploadedImage(file)
    await deliveryNoteUpload.previewDeliveryNote(file)
  }

  // Handle final upload
  const handleUpload = () => {
    if (!storeId) {
      return
    }

    deliveryNoteUpload.mutate({ storeId })
  }

  // Reset form to initial state
  const handleReset = () => {
    setUploadedImage(null)
    setCurrentPage(0)
    deliveryNoteUpload.resetPreview()
  }

  // Pagination calculations
  const totalPages = Math.ceil(deliveryNoteUpload.items.length / itemsPerPage)

  // Generic update handler for BatchValidationTable
  const handleUpdateItem = (index: number, field: keyof CsvPreviewItem, value: string | number) => {
    switch (field) {
      case 'SKU':
        deliveryNoteUpload.updateItemSku(index, value as string)
        break
      case 'Product_Name':
        deliveryNoteUpload.updateItemProductName(index, value as string)
        break
      case 'Quantity':
        deliveryNoteUpload.updateItemQuantity(index, value as number)
        break
      case 'Cost_Price':
        deliveryNoteUpload.updateItemCostPrice(index, value as number)
        break
      case 'Selling_Price':
        deliveryNoteUpload.updateItemSellingPrice(index, value as number)
        break
      case 'Expiry_Date':
        deliveryNoteUpload.updateItemExpiry(index, value as string)
        break
      default:
        break
    }
  }

  // Stage 5: Results Display
  if (deliveryNoteUpload.uploadResult) {
    return (
      <div className="flex flex-col gap-6 sm:min-w-xl lg:w-3xl mx-auto">
        <UploadResultsDisplay
          result={deliveryNoteUpload.uploadResult}
          onUploadAnother={handleReset}
          uploadType="delivery-note"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 sm:min-w-xl lg:w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 flex-col justify-center">
        <div className="flex items-center gap-1">
          <Camera className="w-6 h-6 text-secondary-900" />
          <Typography variant="h3" className="text-primary-800 font-black">
            Delivery Note Upload
          </Typography>
        </div>
        <Typography variant="p" className="text-center">
          Upload an image of your delivery note to automatically extract inventory items
        </Typography>
      </div>

      {/* Stage 1: File Upload (no image selected yet) */}
      {!uploadedImage && (
        <ImageUploadZone
          onImageSelected={handleImageSelect}
          onCameraOpen={() => setShowCameraModal(true)}
          disabled={deliveryNoteUpload.isPreviewLoading}
        />
      )}

      {/* Camera Modal */}
      <DeliveryNoteCameraModal
        open={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onImageSelected={handleImageSelect}
      />

      {/* Stage 2: OCR Processing */}
      {uploadedImage && deliveryNoteUpload.isPreviewLoading && (
        <OCRProcessingState fileName={uploadedImage.name} fileSize={uploadedImage.size} />
      )}

      {/* Stage 3 & 4: Validation Table + Upload Button */}
      {!deliveryNoteUpload.isPreviewLoading &&
        deliveryNoteUpload.items.length > 0 &&
        !deliveryNoteUpload.uploadResult && (
          <Card className="p-6">
            <div className="space-y-4">
              <BatchValidationTable
                items={deliveryNoteUpload.items}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onUpdateItem={handleUpdateItem}
                disabled={deliveryNoteUpload.isPending}
                itemsPerPage={itemsPerPage}
              />

              {/* Upload Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={deliveryNoteUpload.isPending || hasInvalidPricing}
                  className="flex-1"
                  size="lg"
                  title={
                    hasInvalidPricing ? 'Please fix pricing errors before uploading' : undefined
                  }
                >
                  {deliveryNoteUpload.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Upload Delivery Note
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleReset}
                  variant="outline"
                  disabled={deliveryNoteUpload.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

      {/* Error Display */}
      {deliveryNoteUpload.uploadError && (
        <Alert variant="destructive">
          <AlertTitle>Upload Failed</AlertTitle>
          <AlertDescription>
            {deliveryNoteUpload.uploadError instanceof Error
              ? deliveryNoteUpload.uploadError.message
              : String(deliveryNoteUpload.uploadError)}
          </AlertDescription>
        </Alert>
      )}

      {deliveryNoteUpload.previewError && !deliveryNoteUpload.isPreviewLoading && (
        <Alert variant="destructive">
          <AlertTitle>OCR Processing Failed</AlertTitle>
          <AlertDescription>{deliveryNoteUpload.previewError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
