'use client'

import { BarChart3, Check, RefreshCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useInventoryActions, useScannedItemConverter } from '@/hooks/use-inventory-submission'
import { useStoreState } from '@/lib/stores/store-context'
import BaseScanningInterface, {
  type BaseScanningCallbacks,
  type BaseScanningConfig,
} from '../configurable-scanning-interface'
import type { ScannedItem } from '../shared'

interface ScanInInterfaceProps {
  onItemAdded?: (item: ScannedItem) => void
  className?: string
}

export default function ScanInInterface({ onItemAdded, className }: ScanInInterfaceProps) {
  const { activeStore } = useStoreState()
  const { submitBatch, isSubmittingBatch } = useInventoryActions()
  const { convertMultipleScannedItems } = useScannedItemConverter()

  // Dialog states
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<{
    successCount: number
    totalCount: number
  } | null>(null)
  const [pendingItems, setPendingItems] = useState<ScannedItem[]>([])

  // Scan-in specific configuration
  const config: BaseScanningConfig = {
    workflowType: 'scan-in',
    enableBarcodeScanning: true,
    enableOCRScanning: true,
    enableProductLookup: true,
    enableManualEntry: true,
    enableBatchSubmission: true,
    showQuantityField: true,
    showPriceField: true,
    showExpiryField: true,
    scanningTitle: 'Scan Product Barcode',
    confirmationTitle: 'Product Details',
    submitButtonText: 'Add to Inventory',
  }

  const callbacks: BaseScanningCallbacks = {
    onItemProcessed: item => {
      onItemAdded?.(item)
    },

    onBatchSubmitted: async items => {
      setPendingItems(items)
      setShowSubmissionDialog(true)
    },

    onError: error => {},

    onProductFound: product => {},

    onWorkflowComplete: () => {},
  }

  const handleConfirmSubmission = () => {
    // Convert scanned items to the format expected by the inventory submission
    const productsToSubmit = convertMultipleScannedItems(
      pendingItems.map(item => ({
        barcode: item.barcode,
        productName: item.productName,
        brand: item.brand,
        expiryDate: item.expiryDate,
        quantity: item.quantity,
        price: item.price,
      })),
    )

    // Submit the batch to inventory using the React Query hook
    submitBatch(
      productsToSubmit.map(product => ({
        ...product,
        storeId: activeStore?.store_id || '',
        ocrExtractedDate: new Date().toISOString(),
        ocrConfidence: 1,
      })),
      {
        onSuccess: result => {
          // Store the result for the success dialog
          setSubmissionResult({
            successCount: result.successCount,
            totalCount: productsToSubmit.length,
          })

          // Clear the batch and close submission dialog
          setPendingItems([])
          setShowSubmissionDialog(false)

          // Show success dialog
          setShowSuccessDialog(true)
        },
        onError: error => {
          // Dialog stays open so user can retry or cancel
        },
      },
    )
  }

  const formatPrice = (price: number) => `€${price.toFixed(2)}`

  return (
    <>
      <BaseScanningInterface config={config} callbacks={callbacks} className={className} />

      {/* Submission Confirmation Dialog */}
      {showSubmissionDialog && (
        <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Confirm Submission</DialogTitle>
              <DialogDescription>
                Review the items below before submitting them to your inventory.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                You are about to submit {pendingItems.length} item
                {pendingItems.length > 1 ? 's' : ''} to inventory:
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
                        <div className="font-medium">
                          {item.quantity}x {formatPrice(item.price)}
                        </div>
                        <div className="text-xs text-gray-600">
                          Total: {formatPrice(totalValue)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Total Summary */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center font-medium">
                  <span>Total Items:</span>
                  <span>{pendingItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <div className="flex justify-between items-center font-medium">
                  <span>Total Value:</span>
                  <span>
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
                disabled={isSubmittingBatch}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleConfirmSubmission}
                disabled={isSubmittingBatch}
              >
                <Check className="w-6 h-6 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
                {isSubmittingBatch ? 'Submitting...' : 'Submit to Inventory'}
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
                <Check className="w-6 h-6 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
                Inventory Updated Successfully!
              </DialogTitle>
              <DialogDescription>
                {submissionResult.successCount === submissionResult.totalCount
                  ? `Successfully added ${submissionResult.successCount} item${submissionResult.successCount > 1 ? 's' : ''} to your inventory.`
                  : `Added ${submissionResult.successCount} of ${submissionResult.totalCount} items to inventory.`}
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
                Keep Scanning
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessDialog(false)
                  // Navigate to dashboard
                  window.location.href = '/dashboard/inventory/batches'
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
    </>
  )
}
