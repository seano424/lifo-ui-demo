'use client'

import { AlertCircle, Check, Package, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import ManualBarcodeEntry from '@/components/barcode/manual-barcode-entry'
import {
  InventoryForm,
  type InventoryFormData,
  type ScannedItem,
  ScannedItemsList,
} from '@/components/scanning/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Typography } from '@/components/ui/typography'
import { useInboundScanningSession } from '@/hooks/use-inbound-scanning-session'
import { useInventoryActions, useScannedItemConverter } from '@/hooks/use-inventory-submission'
import type { InventorySubmissionResult } from '@/lib/queries/inventory'
import { useStoreState } from '@/lib/stores/store-context'

interface ProductData {
  barcode: string
  productName: string
  brand: string
  category: string
  imageUrl: string
  isManualEntry: boolean
  lookupResult?: unknown
  productId?: string
}

interface ManualInboundEntryProps {
  storeId?: string
  onBatchSubmitted?: (result: InventorySubmissionResult[]) => void
  className?: string
}

interface SelectedProduct {
  barcode: string
  productName: string
  brand?: string
  category?: string
  imageUrl?: string
}

export default function ManualInboundEntry({
  storeId: propStoreId,
  onBatchSubmitted,
  className = '',
}: ManualInboundEntryProps) {
  const { activeStore } = useStoreState()
  const storeId = propStoreId || activeStore?.store_id

  // Product selection state
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null)

  // Form data for current item
  const [inventoryData, setInventoryData] = useState<InventoryFormData>({
    expiryDate: '',
    quantity: 1,
    price: 0,
  })

  // Global scanning session state
  const {
    items: scannedItems,
    addItem,
    removeItem,
    updateItem,
    clearSession,
  } = useInboundScanningSession(storeId)

  // Submission state
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<{
    successCount: number
    totalCount: number
  } | null>(null)

  // Hooks for inventory submission
  const { submitBatch, isSubmittingBatch } = useInventoryActions()
  const { convertMultipleScannedItems } = useScannedItemConverter()

  // Handle product selection from ManualBarcodeEntry
  const handleProductSelected = (barcode: string, productData: ProductData) => {
    setSelectedProduct({
      barcode,
      productName: productData.productName,
      brand: productData.brand,
      category: productData.category,
      imageUrl: productData.imageUrl,
    })

    // Reset form for new entry but keep selected product
    setInventoryData({
      expiryDate: '',
      quantity: 1,
      price: 0,
    })
  }

  // Handle adding item to the list
  const handleAddBatch = () => {
    if (
      !selectedProduct ||
      !inventoryData.expiryDate ||
      inventoryData.quantity <= 0 ||
      inventoryData.price <= 0
    ) {
      return
    }

    const newItem: ScannedItem = {
      id: Date.now().toString(),
      barcode: selectedProduct.barcode,
      productName: selectedProduct.productName || 'Unknown Product',
      brand: selectedProduct.brand,
      expiryDate: inventoryData.expiryDate,
      quantity: inventoryData.quantity,
      price: inventoryData.price,
      timestamp: new Date(),
    }

    addItem(newItem)

    // Clear form and product selection for next entry
    setSelectedProduct(null)
    setInventoryData({
      expiryDate: '',
      quantity: 1,
      price: 0,
    })
  }

  // Handle clearing current selection
  const handleClearSelection = () => {
    setSelectedProduct(null)
    setInventoryData({
      expiryDate: '',
      quantity: 1,
      price: 0,
    })
  }

  // Handle submission dialog
  const handleFinalSubmission = () => {
    if (scannedItems.length === 0) return
    setShowSubmissionDialog(true)
  }

  // Handle actual submission
  const handleConfirmSubmission = () => {
    if (!storeId) {
      console.error('No store ID available')
      return
    }

    const productsToSubmit = convertMultipleScannedItems(
      scannedItems.map(item => ({
        barcode: item.barcode,
        productName: item.productName,
        brand: item.brand,
        expiryDate: item.expiryDate,
        quantity: item.quantity,
        price: item.price,
      })),
    )

    submitBatch(
      productsToSubmit.map(product => ({
        ...product,
        storeId: storeId,
        ocrExtractedDate: new Date().toISOString(),
        ocrConfidence: 1,
      })),
      {
        onSuccess: result => {
          setSubmissionResult({
            successCount: result.successCount,
            totalCount: productsToSubmit.length,
          })

          // Clear items after successful submission
          clearSession()
          setShowSubmissionDialog(false)
          setShowSuccessDialog(true)

          onBatchSubmitted?.(result.results)
        },
        onError: error => {
          console.error('Batch submission failed:', error)
        },
      },
    )
  }

  const formatPrice = (price: number) => `€${price.toFixed(2)}`

  // Helper function to format date consistently
  const formatExpiryDate = (dateString: string) => {
    // Ensure we treat the date as local time to avoid timezone shifts
    const date = new Date(`${dateString}T00:00:00`)
    return date.toLocaleDateString()
  }

  const canAddBatch =
    selectedProduct &&
    inventoryData.expiryDate &&
    inventoryData.quantity > 0 &&
    inventoryData.price > 0

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="space-y-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Product Selection Section */}
          {!selectedProduct ? (
            <ManualBarcodeEntry
              onProductSelected={handleProductSelected}
              mode="inbound"
              storeId={storeId}
            />
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-primary-600" />
                      <Typography variant="h3">Selected Product</Typography>
                    </div>
                    <div className="space-y-1 text-sm flex flex-col">
                      <Typography variant="p">
                        <span>Name:</span> {selectedProduct.productName}
                      </Typography>
                      {selectedProduct.brand && (
                        <Typography variant="p">
                          <span>Brand:</span> {selectedProduct.brand}
                        </Typography>
                      )}
                      {selectedProduct.category && (
                        <Typography variant="p">
                          <span>Category:</span> {selectedProduct.category}
                        </Typography>
                      )}
                      <Typography variant="p">
                        <span>Barcode:</span>{' '}
                        <code className="bg-gray-100 px-1 py-0.5 rounded">
                          {selectedProduct.barcode}
                        </code>
                      </Typography>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inventory Details Section - Only show when product is selected */}
          {selectedProduct && (
            <>
              <InventoryForm
                data={inventoryData}
                onChange={setInventoryData}
                showSubmitButton={false}
                title="Batch Details"
                className="border-2 border-dashed"
              />

              <div className="flex gap-3">
                <Button
                  onClick={handleAddBatch}
                  disabled={!canAddBatch}
                  size="lg"
                  className="flex-1"
                  variant="secondary"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Batch
                </Button>
                <Button onClick={handleClearSelection} variant="outline" size="lg">
                  Clear
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Recently Added Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <CardTitle>Batch items to submit</CardTitle>
                <CardDescription>
                  {scannedItems.length} batch
                  {scannedItems.length !== 1 ? 'es' : ''} ready to submit
                </CardDescription>
              </div>
              <Button
                onClick={handleFinalSubmission}
                disabled={scannedItems.length === 0 || isSubmittingBatch}
                variant="secondary"
              >
                <Check className="w-4 h-4 mr-2" />
                Submit All ({scannedItems.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScannedItemsList
              items={scannedItems}
              onItemUpdated={updateItem}
              onDeleteItem={removeItem}
            />
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {scannedItems.length === 0 && !selectedProduct && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Start by searching for a product using the barcode or product name search above. After
            selecting a product, you'll be able to add expiry date, quantity, and price.
          </AlertDescription>
        </Alert>
      )}

      {/* Submission Confirmation Dialog */}
      <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              Review the items below before submitting them to your inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Typography variant="p">
              You are about to submit {scannedItems.length} batch
              {scannedItems.length !== 1 ? 'es' : ''} to inventory:
            </Typography>

            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50">
              {scannedItems.map(item => {
                const totalValue = item.quantity * item.price
                return (
                  <div
                    key={item.id}
                    className="flex justify-between items-start p-2 bg-white rounded border text-sm"
                  >
                    <div className="flex-1">
                      <Typography variant="p">{item.productName}</Typography>
                      {item.brand && <Typography variant="p">{item.brand}</Typography>}
                      <Typography variant="p">
                        Expires: {formatExpiryDate(item.expiryDate)}
                      </Typography>
                    </div>
                    <div className="text-right">
                      <Typography variant="p">
                        {item.quantity}x {formatPrice(item.price)}
                      </Typography>
                      <Typography variant="p">Total: {formatPrice(totalValue)}</Typography>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between items-center font-medium">
                <span>Total Items:</span>
                <span>{scannedItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="flex justify-between items-center font-medium">
                <span>Total Value:</span>
                <span>
                  {formatPrice(
                    scannedItems.reduce((sum, item) => sum + item.quantity * item.price, 0),
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
              <Check className="w-4 h-4 mr-2" />
              {isSubmittingBatch ? 'Submitting...' : 'Submit to Inventory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      {showSuccessDialog && submissionResult && (
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                Inventory Updated Successfully!
              </DialogTitle>
              <DialogDescription>
                {submissionResult.successCount === submissionResult.totalCount
                  ? `Successfully added ${submissionResult.successCount} batch${submissionResult.successCount !== 1 ? 'es' : ''} to your inventory.`
                  : `Added ${submissionResult.successCount} of ${submissionResult.totalCount} batches to inventory.`}
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
                Add More Products
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessDialog(false)
                  window.location.href = '/dashboard/inventory/batches'
                }}
                className="w-full"
              >
                View in Inventory
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
