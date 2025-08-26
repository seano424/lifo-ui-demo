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

interface AvailableBatch {
  batch_id: string
  product_id: string
  store_id: string
  expiry_date: string
  current_quantity: number
  cost_price: number
  selling_price: number
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
  const { submitCheckout, isSubmittingCheckout, findAvailableBatches } = useScanOutActions()

  // Dialog states
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<{
    successCount: number
    totalCount: number
  } | null>(null)
  const [pendingItems, setPendingItems] = useState<ScannedItem[]>([])

  // Available batches for the current product
  const [availableBatches, setAvailableBatches] = useState<AvailableBatch[]>([])
  const [showBatchSelector, setShowBatchSelector] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<CurrentProduct | null>(null)

  // Scan-out specific configuration
  const config: BaseScanningConfig = {
    workflowType: 'scan-out',
    enableBarcodeScanning: true,
    enableOCRScanning: false, // No OCR needed - products exist in system
    enableProductLookup: false, // We look up from our inventory instead
    enableManualEntry: true,
    enableBatchSubmission: true,
    showQuantityField: true,
    showPriceField: false, // Price comes from existing inventory
    showExpiryField: false, // Expiry date selected from available batches
    scanningTitle: 'Scan Product to Remove',
    confirmationTitle: 'Remove from Inventory',
    submitButtonText: 'Remove from Inventory',
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

          if (batches.length === 1) {
            // Only one batch available, auto-select it
            setCurrentProduct({
              ...product,
              batch: batches[0],
              availableQuantity: batches[0].current_quantity,
              expiryDate: batches[0].expiry_date,
              price: batches[0].cost_price,
            })
          } else {
            // Multiple batches available, show selector
            setAvailableBatches(batches)
            setCurrentProduct(product)
            setShowBatchSelector(true)
          }
        } catch (error) {
          console.error('Error finding available batches:', error)
          return { error: 'Failed to lookup inventory' }
        }
      }
    },

    onWorkflowComplete: () => {
      console.log('Scan-out workflow completed')
    },
  }

  const handleBatchSelected = (batch: AvailableBatch) => {
    if (currentProduct) {
      setCurrentProduct({
        ...currentProduct,
        batch,
        availableQuantity: batch.current_quantity,
        expiryDate: batch.expiry_date,
        price: batch.cost_price,
      })
    }
    setShowBatchSelector(false)
    setAvailableBatches([])
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
      <BaseScanningInterface config={config} callbacks={callbacks} className={className} />

      {/* Batch Selection Dialog */}
      {showBatchSelector && (
        <Dialog open={showBatchSelector} onOpenChange={setShowBatchSelector}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Select Batch to Remove</DialogTitle>
              <DialogDescription>
                Multiple batches are available for this product. Select which one to remove from:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Product: <strong>{currentProduct?.productName || 'Unknown Product'}</strong>
              </div>

              <div className="space-y-2">
                {availableBatches.map(batch => (
                  <div
                    key={batch.batch_id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => handleBatchSelected(batch)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">
                          Expires: {new Date(batch.expiry_date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          Available: {batch.current_quantity} units
                        </div>
                        <div className="text-sm text-gray-600">
                          Cost: {formatPrice(batch.cost_price)}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Select
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setShowBatchSelector(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
