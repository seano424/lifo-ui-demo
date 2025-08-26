'use client'

import { AlertCircle, BarChart3, Check, RefreshCcw } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useStoreState } from '@/lib/stores/store-context'
import BaseScanningInterface, {
  type BaseScanningCallbacks,
  type BaseScanningConfig,
} from '../base-scanning-interface'
import type { ScannedItem } from '../shared'
import { useScanOutActions } from './use-scan-out-actions'
import ScanningCamera from '../shared/scanning-camera'
import BatchSelectionList from '../shared/batch-selection-list'
import { useOCRWithFallback } from '@/hooks/use-ocr-processing'
import { captureImageFromVideo } from '@/lib/api/ocr-client'
import { useScanningActions } from '@/lib/stores/scanning-workflow-store'

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

export default function ScanOutInterface({ onItemRemoved, className }: ScanOutInterfaceProps) {
  const { activeStore } = useStoreState()
  const { submitCheckout, isSubmittingCheckout, findAvailableBatches, matchBatchByExpiry } = useScanOutActions()
  const workflowActions = useScanningActions()
  
  // OCR processing hook for expiry date capture
  const {
    processExpiryDate,
    isLoading: isOCRProcessing,
    isBackendHealthy,
  } = useOCRWithFallback()

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

  // Scan-out specific configuration
  const config: BaseScanningConfig = {
    workflowType: 'scan-out',
    enableBarcodeScanning: true,
    enableOCRScanning: true, // Enable OCR for expiry date capture in batch selection
    enableProductLookup: false, // We'll handle product lookup ourselves
    enableManualEntry: true,
    enableBatchSubmission: true,
    showQuantityField: true,
    showPriceField: false, // Price comes from existing inventory
    showExpiryField: false, // Expiry date selected from available batches
    scanningTitle: 'Scan Product to Remove',
    confirmationTitle: 'Remove from Inventory',
    submitButtonText: 'Remove from Inventory',
  }

  // Custom barcode scan handler for scan-out
  const handleCustomBarcodeScanned = async (barcode: string) => {
    console.log('Custom barcode scan for scan-out:', barcode)
    
    if (!activeStore) {
      console.error('No active store selected')
      return
    }

    try {
      const batches = await findAvailableBatches(barcode, activeStore.store_id)

      if (batches.length === 0) {
        // No inventory available for this product
        console.warn('No inventory found for barcode:', barcode)
        return
      }

      // Always show batch list regardless of count
      setAvailableBatches(batches)
      setCurrentProduct({
        barcode,
        productName: batches[0]?.products.product_name || 'Unknown Product'
      })
      setCurrentStep('batch-selection')
      setSelectedBatch(null) // Reset selection
      
      console.log(`Found ${batches.length} batches for ${barcode}`)
    } catch (error) {
      console.error('Error finding available batches:', error)
    }
  }

  const callbacks: BaseScanningCallbacks = {
    onItemProcessed: item => {
      console.log('Item processed for scan-out:', item)
      onItemRemoved?.(item)
    },

    onBatchSubmitted: async items => {
      setPendingItems(items)
      setShowSubmissionDialog(true)
    },

    onError: error => {
      console.error('Scan-out error:', error)
    },

    onProductFound: async product => {
      console.log('Product scanned for scan-out:', product)

      // Instead of using OpenFoodFacts, we look up available batches from our inventory
      if (product.barcode && activeStore) {
        try {
          const batches = await findAvailableBatches(product.barcode, activeStore.store_id)

          if (batches.length === 0) {
            // No inventory available for this product
            return { error: 'No inventory found for this product' }
          }

          // Always show batch list regardless of count
          // This provides consistent UX and allows users to see all available options
          setAvailableBatches(batches)
          setCurrentProduct(product)
          setCurrentStep('batch-selection')
          
          // Return a pending state - the workflow will wait for batch selection
          return { pending: true }
        } catch (error) {
          console.error('Error finding available batches:', error)
          return { error: 'Failed to lookup inventory' }
        }
      }
      
      return { error: 'No barcode or store provided' }
    },

    onWorkflowComplete: () => {
      console.log('Scan-out workflow completed')
    },
  }

  const handleBatchSelected = (batch: AvailableBatch) => {
    if (currentProduct) {
      setSelectedBatch(batch)
      setQuantity(1) // Default quantity
      setCurrentStep('quantity-entry')
      console.log('Batch selected:', batch.batch_id, 'Moving to quantity entry')
    }
  }

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
      
      console.log('Item processed:', scannedItem)
      onItemRemoved?.(scannedItem)
      
      // Reset to scanning state for next product
      setCurrentStep('scanning')
      setCurrentProduct(null)
      setAvailableBatches([])
      setSelectedBatch(null)
      setQuantity(1)
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
        const matchedBatch = matchBatchByExpiry(availableBatches, result.expiryDateInfo.extractedDate)
        
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
            onScanError={(error) => console.error('Barcode scan error:', error)}
            showManualEntry={true}
            onToggleManualEntry={() => console.log('Toggle manual entry')}
            onManualProductSelected={handleCustomBarcodeScanned}
            onCloseManualEntry={() => console.log('Close manual entry')}
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="text-green-600 text-lg">✅</div>
              <div>
                <div className="font-medium text-green-900">
                  Product Found: {currentProduct.productName || 'Unknown Product'}
                </div>
                <div className="text-sm text-green-700 mt-1">
                  Ready to select batch for removal
                </div>
              </div>
            </div>
          </div>

          {/* Main Selection Interface */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column: OCR Expiry Date Capture */}
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-purple-50">
                <div className="text-sm font-medium text-purple-900 mb-3">
                  📸 Scan Expiry Date to Auto-Match
                </div>
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
              </div>
            </div>

            {/* Right Column: Batch Selection List */}
            <div className="space-y-4">
              <BatchSelectionList
                batches={availableBatches}
                onBatchSelected={handleBatchSelected}
                selectedBatchId={selectedBatch?.batch_id}
                className="border rounded-lg p-4 bg-gray-50"
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="text-blue-600 text-lg">📦</div>
              <div>
                <div className="font-medium text-blue-900">
                  Selected: {selectedBatch.products.product_name}
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  Batch #{selectedBatch.batch_number || selectedBatch.batch_id.slice(-8)} • 
                  Expires: {new Date(selectedBatch.expiry_date).toLocaleDateString()} • 
                  Available: {selectedBatch.available_quantity || selectedBatch.current_quantity} units
                  {selectedBatch.location_code && ` • Location: ${selectedBatch.location_code}`}
                </div>
              </div>
            </div>
          </div>

          {/* Quantity Selection */}
          <div className="bg-white border rounded-lg p-6">
            <div className="space-y-4">
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
                    onChange={(e) => setQuantity(Math.max(1, Math.min(selectedBatch.current_quantity, parseInt(e.target.value) || 1)))}
                    className="w-20 text-center border rounded px-3 py-2"
                    min="1"
                    max={selectedBatch.current_quantity}
                  />
                  <Button
                    variant="outline"
                    size="sm" 
                    onClick={() => setQuantity(Math.min(selectedBatch.current_quantity, quantity + 1))}
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
                <div className="font-medium">Total cost: {formatPrice(selectedBatch.cost_price * quantity)}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('batch-selection')}
            >
              ← Back to Batches
            </Button>
            <Button 
              onClick={handleQuantityConfirmed}
              className="bg-red-600 hover:bg-red-700 text-white px-8"
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
