'use client'

import { AlertCircle, BarChart3, Check, Package, RefreshCcw } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Typography } from '@/components/ui/typography'
import { useOCRWithFallback } from '@/hooks/use-ocr-processing'
import { captureImageFromVideo } from '@/lib/api/ocr-client'
import { useStoreState } from '@/lib/stores/store-context'
import { createClient } from '@/lib/supabase/client'
// Note: We're not using BaseScanningInterface in this implementation
// Instead we have a custom workflow with manual state management
import type { ScannedItem } from '../shared'
import BatchSelectionList from '../shared/batch-selection-list'
import ScanningCamera from '../shared/scanning-camera'
import { useScanOutActions } from './use-scan-out-actions'

interface ProductData {
  product_id: string
  name: string
  brand: string | null
  category: string | null
  barcode: string | null
  image_url: string | null
  unit_type: string | null
}

interface AvailableBatch {
  batch_id: string
  batch_number: string | null
  product_id: string
  store_id: string
  expiry_date: string
  current_quantity: number
  available_quantity: number
  cost_price: number
  selling_price: number
  location_code: string | null
  status: string
  created_at: string
  products: {
    product_name: string
    brand_name: string
    barcode: string
  }
}

interface CurrentProduct {
  barcode: string
  productName?: string
  batch?: AvailableBatch
  availableQuantity?: number
  expiryDate?: string
  price?: number
}

interface ScanOutInterfaceProps {
  onItemRemoved?: (item: ScannedItem) => void
  className?: string
}

export default function ScanOutInterface({ onItemRemoved }: ScanOutInterfaceProps) {
  const { activeStore } = useStoreState()
  const { submitCheckout, isSubmittingCheckout, findAvailableBatches, matchBatchByExpiry } =
    useScanOutActions()

  // OCR processing hook for expiry date capture
  const { processExpiryDate, isLoading: isOCRProcessing, isBackendHealthy } = useOCRWithFallback()

  // Dialog states
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<{
    successCount: number
    totalCount: number
  } | null>(null)
  const [pendingItems, setPendingItems] = useState<ScannedItem[]>([])

  // Workflow states
  type ScanOutStep = 'scanning' | 'batch-selection' | 'quantity-entry'
  const [currentStep, setCurrentStep] = useState<ScanOutStep>('scanning')

  // Available batches for the current product
  const [availableBatches, setAvailableBatches] = useState<AvailableBatch[]>([])
  const [currentProduct, setCurrentProduct] = useState<CurrentProduct | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<AvailableBatch | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number>(1)

  // Custom barcode scan handler for scan-out
  const handleCustomBarcodeScanned = async (barcode: string, _productData?: unknown) => {
    if (!activeStore) {
      console.error('No active store selected')
      return
    }

    try {
      let batches: AvailableBatch[] = []

      // Check if this is an internal product ID (from manual search)
      if (barcode.startsWith('INTERNAL-')) {
        const productId = barcode.replace('INTERNAL-', '')
        console.log('Using internal product ID:', productId)

        // Get batches directly by product_id instead of barcode
        const supabase = createClient()
        const { data: batchesData, error } = await supabase
          .schema('inventory')
          .from('batches')
          .select(
            `
            batch_id,
            batch_number,
            product_id,
            store_id,
            expiry_date,
            current_quantity,
            available_quantity,
            cost_price,
            selling_price,
            location_code,
            status,
            created_at,
            products (
              product_id,
              name,
              brand,
              category,
              barcode,
              image_url,
              unit_type
            )
          `,
          )
          .eq('product_id', productId)
          .eq('store_id', activeStore.store_id)
          .eq('status', 'active')
          .gt('current_quantity', 0)
          .order('expiry_date', { ascending: true })

        if (error) {
          console.error('Error fetching batches by product_id:', error)
          return
        }

        batches =
          batchesData?.map(batch => ({
            ...batch,
            products: {
              product_name: (batch.products as unknown as ProductData)?.name || 'Unknown Product',
              brand_name: (batch.products as unknown as ProductData)?.brand || 'Unknown Brand',
              barcode: (batch.products as unknown as ProductData)?.barcode || '',
            },
          })) || []
      } else {
        // Regular barcode lookup
        batches = await findAvailableBatches(barcode, activeStore.store_id)
      }

      if (batches.length === 0) {
        console.warn('No inventory found for barcode:', barcode)
        return
      }

      setAvailableBatches(batches)
      setCurrentProduct({
        barcode,
        productName: batches[0]?.products.product_name || 'Unknown Product',
      })
      setCurrentStep('batch-selection')
      setSelectedBatch(null)
    } catch (error) {
      console.error('Error finding available batches:', error)
    }
  }

  const handleBatchSelected = useCallback(
    (batch: AvailableBatch) => {
      if (currentProduct) {
        setSelectedBatch(batch)
        setQuantity(1)
        setCurrentStep('quantity-entry')
      }
    },
    [currentProduct],
  )

  const handleQuantityConfirmed = () => {
    if (currentProduct && selectedBatch) {
      const scannedItem: ScannedItem = {
        id: selectedBatch.batch_id,
        barcode: currentProduct.barcode,
        productName: selectedBatch.products.product_name,
        brand: selectedBatch.products.brand_name,
        quantity: quantity,
        expiryDate: selectedBatch.expiry_date,
        price: selectedBatch.cost_price,
        timestamp: new Date(),
      }

      // Submit the removal immediately to the database
      submitCheckout(
        [
          {
            batchId: selectedBatch.batch_id,
            quantityRemoved: quantity,
            reason: 'scan-out',
            storeId: activeStore?.store_id || '',
            notes: `Removed ${quantity} unit(s) of ${selectedBatch.products.product_name}`,
          },
        ],
        {
          onSuccess: result => {
            console.log('Item removed successfully:', result)

            // Call the parent callback for UI update
            onItemRemoved?.(scannedItem)

            // Reset to scanning state for next product
            setCurrentStep('scanning')
            setCurrentProduct(null)
            setAvailableBatches([])
            setSelectedBatch(null)
            setQuantity(1)
          },
          onError: error => {
            console.error('Failed to remove item from inventory:', error)
            // Keep the current state so user can retry
          },
        },
      )
    }
  }

  const handleBackToScanning = () => {
    setCurrentStep('scanning')
    setCurrentProduct(null)
    setAvailableBatches([])
    setSelectedBatch(null)
    setQuantity(1)
  }

  const handleOCRExpiryCapture = async () => {
    if (!activeStore) {
      setOcrError('No active store selected')
      return
    }

    try {
      setOcrError(null)

      const videoElement = document.querySelector('video') as HTMLVideoElement
      if (!videoElement || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
        throw new Error('Camera not ready')
      }

      const imageBlob = await captureImageFromVideo(videoElement)
      const result = await processExpiryDate(imageBlob, activeStore.store_id, {
        confidenceThreshold: 0.65,
        maxProcessingTimeMs: 5000,
      })

      if (result.success && result.expiryDateInfo?.extractedDate && availableBatches.length > 0) {
        // Try to match the captured date to an available batch
        const matchedBatch = matchBatchByExpiry(
          availableBatches,
          result.expiryDateInfo.extractedDate,
        )

        if (matchedBatch) {
          handleBatchSelected(matchedBatch)
        } else {
          // No matching batch found
          setOcrError(`No batch found with expiry date: ${result.expiryDateInfo.extractedDate}`)
        }
      } else {
        setOcrError(result.error?.message || 'OCR processing failed')
      }
    } catch (error) {
      console.error('OCR capture failed:', error)
      setOcrError(error instanceof Error ? error.message : 'OCR processing failed')
    }
  }

  const clearOCRError = () => {
    setOcrError(null)
  }

  const handleConfirmSubmission = () => {
    console.log('Submitting scan-out for', pendingItems.length, 'items:', pendingItems)

    // Submit the checkout/removal to inventory
    submitCheckout(
      pendingItems.map(item => ({
        batchId: item.id, // This would be the actual batch ID in a real implementation
        quantityRemoved: item.quantity,
        reason: 'scan-out', // Could be 'sale', 'waste', 'transfer', etc.
        storeId: activeStore?.store_id || '',
      })),
      {
        onSuccess: result => {
          console.log('Checkout submission completed:', result)

          // Store the result for the success dialog
          setSubmissionResult({
            successCount: result.successCount || pendingItems.length,
            totalCount: pendingItems.length,
          })

          // Clear the batch and close submission dialog
          setPendingItems([])
          setShowSubmissionDialog(false)

          // Show success dialog
          setShowSuccessDialog(true)
        },
        onError: error => {
          console.error('Checkout submission failed:', error)
          // Dialog stays open so user can retry or cancel
        },
      },
    )
  }

  const formatPrice = (price: number) => `€${price.toFixed(2)}`

  return (
    <>
      {/* Step 1: Barcode Scanning */}
      {currentStep === 'scanning' && (
        <div className="space-y-4">
          <ScanningCamera
            mode="barcode"
            onBarcodeScanned={handleCustomBarcodeScanned}
            onScanError={error => console.error('Barcode scan error:', error)}
            showManualEntry={true}
            onToggleManualEntry={() => console.log('Toggle manual entry')}
            onManualProductSelected={handleCustomBarcodeScanned}
            onCloseManualEntry={() => console.log('Close manual entry')}
            manualEntryMode="outbound"
            storeId={activeStore?.store_id}
            title="Scan Product to Remove"
            subtitle="Point camera at product barcode"
            className="w-full"
          />
        </div>
      )}

      {/* Step 2: Batch Selection */}
      {currentStep === 'batch-selection' && currentProduct && (
        <div className="mt-6 space-y-6">
          {/* Product Context */}
          {/* <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="text-green-600 text-lg">✅</div>
              <div>
                <div className="font-medium text-green-900">
                  Product Found:{' '}
                  {currentProduct.productName || 'Unknown Product'}
                </div>
                <div className="text-sm text-green-700 mt-1">
                  Ready to select batch for removal
                </div>
              </div>
            </div>
          </div> */}

          <Card className="border-primary-50 shadow-primary-100">
            <CardContent className="p-3">
              <div className="flex justify-center items-center gap-2">
                <div className="flex flex-col gap-2 justify-center items-center">
                  <Typography className="text-secondary-900 font-black" variant="p">
                    Selected Product
                  </Typography>
                  <div className="flex flex-wrap text-center justify-center items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-gray-500" />

                    <Typography variant="p">
                      {currentProduct?.availableQuantity} units available
                    </Typography>
                    <Typography variant="p">•</Typography>
                    <Typography variant="p">{currentProduct?.productName}</Typography>
                    <Typography variant="p">•</Typography>
                    <Typography variant="p">{currentProduct?.barcode}</Typography>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Selection Interface */}
          <div className="flex flex-col gap-6">
            <ScanningCamera
              mode="ocr"
              onOCRCapture={handleOCRExpiryCapture}
              isOCRProcessing={isOCRProcessing}
              ocrError={ocrError}
              onClearOCRError={clearOCRError}
              isBackendHealthy={isBackendHealthy}
              title="Capture Expiry Date"
              subtitle="Point camera at expiry date"
              autoStart={false}
              className="w-full"
            />

            {/* Batch Selection List */}
            <div className="space-y-4">
              <BatchSelectionList
                batches={availableBatches}
                onBatchSelected={handleBatchSelected}
                selectedBatchId={selectedBatch?.batch_id}
              />
            </div>
          </div>

          {/* Back Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleBackToScanning}
              className="flex items-center gap-2"
            >
              ← Back to Change Product
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Quantity Entry */}
      {currentStep === 'quantity-entry' && currentProduct && selectedBatch && (
        <div className="mt-6 space-y-6">
          {/* Product Context */}
          <Card className="border-primary-50 shadow-primary-100">
            <CardContent className="p-3">
              <div className="flex justify-center items-center gap-2">
                <div className="flex flex-col gap-2 justify-center items-center">
                  <Typography className="text-secondary-900 font-black" variant="p">
                    Selected Product
                  </Typography>
                  <div className="flex flex-wrap text-center justify-center items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-gray-500" />

                    <Typography variant="p">
                      {selectedBatch.current_quantity} units available
                    </Typography>
                    <Typography variant="p">•</Typography>
                    <Typography variant="p">{currentProduct?.productName}</Typography>
                    <Typography variant="p">•</Typography>
                    <Typography variant="p">{currentProduct?.barcode}</Typography>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quantity Selection */}
          <div className="bg-white border border-primary-50 shadow-primary-100 shadow-md rounded-3xl p-6">
            <div className="space-y-4 flex flex-col justify-center items-center text-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to Remove
                </label>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </Button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={e =>
                      setQuantity(
                        Math.max(
                          1,
                          Math.min(
                            selectedBatch.current_quantity,
                            parseInt(e.target.value, 10) || 1,
                          ),
                        ),
                      )
                    }
                    className="w-20 text-center border rounded px-3 py-2"
                    min="1"
                    max={selectedBatch.current_quantity}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setQuantity(Math.min(selectedBatch.current_quantity, quantity + 1))
                    }
                    disabled={quantity >= selectedBatch.current_quantity}
                  >
                    +
                  </Button>
                  <span className="text-sm text-gray-500">
                    of {selectedBatch.current_quantity} available
                  </span>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <div>Cost per unit: {formatPrice(selectedBatch.cost_price)}</div>
                <div className="font-medium">
                  Total cost: {formatPrice(selectedBatch.cost_price * quantity)}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setCurrentStep('batch-selection')}>
              ← Back to Batches
            </Button>
            <Button
              onClick={handleQuantityConfirmed}
              className="bg-primary-900 hover:bg-primary-700 text-white px-8 min-w-80"
            >
              Remove {quantity} unit{quantity > 1 ? 's' : ''} from Inventory
            </Button>
          </div>
        </div>
      )}

      {/* Submission Confirmation Dialog */}
      {showSubmissionDialog && (
        <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Confirm Checkout</DialogTitle>
              <DialogDescription>
                Review the items below before removing them from inventory.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                You are about to remove {pendingItems.length} item
                {pendingItems.length > 1 ? 's' : ''} from inventory:
              </div>

              {/* Summary List */}
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50">
                {pendingItems.map(item => {
                  const totalValue = item.quantity * item.price
                  return (
                    <div
                      key={item.id}
                      className="flex justify-between items-start p-2 bg-white rounded border text-sm"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.productName}</div>
                        {item.brand && <div className="text-xs text-gray-600">{item.brand}</div>}
                        <div className="text-xs text-gray-500">
                          Expires: {new Date(item.expiryDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">
                          -{item.quantity}x {formatPrice(item.price)}
                        </div>
                        <div className="text-xs text-red-500">
                          Remove: {formatPrice(totalValue)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Total Summary */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center font-medium">
                  <span>Total Items Removed:</span>
                  <span className="text-red-600">
                    -{pendingItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center font-medium">
                  <span>Total Value Removed:</span>
                  <span className="text-red-600">
                    -
                    {formatPrice(
                      pendingItems.reduce((sum, item) => sum + item.quantity * item.price, 0),
                    )}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSubmissionDialog(false)}
                disabled={isSubmittingCheckout}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmSubmission}
                disabled={isSubmittingCheckout}
              >
                <Check className="w-4 h-4 mr-2" />
                {isSubmittingCheckout ? 'Processing...' : 'Confirm Removal'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Success Dialog */}
      {showSuccessDialog && submissionResult && (
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="w-6 h-6 text-green-600 stroke-5 border-2 border-green-600 rounded-full p-[3px] bg-green-100" />
                Inventory Updated Successfully!
              </DialogTitle>
              <DialogDescription>
                {submissionResult.successCount === submissionResult.totalCount
                  ? `Successfully removed ${submissionResult.successCount} item${submissionResult.successCount > 1 ? 's' : ''} from inventory.`
                  : `Removed ${submissionResult.successCount} of ${submissionResult.totalCount} items from inventory.`}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 mt-4">
              <Button
                onClick={() => {
                  setShowSuccessDialog(false)
                  setSubmissionResult(null)
                }}
                className="w-full"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Continue Scanning
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessDialog(false)
                  // Navigate to dashboard
                  window.location.href = '/dashboard'
                }}
                className="w-full"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View in Dashboard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* No Inventory Alert */}
      {!availableBatches.length && currentProduct && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No inventory available for this product in the current store.
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}
