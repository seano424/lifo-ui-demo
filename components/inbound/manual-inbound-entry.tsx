'use client'

import {
  AlertCircle,
  Check,
  Package,
  Plus,
  RefreshCcw,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import ManualBarcodeEntry from '@/components/barcode/manual-barcode-entry'
import {
  InventoryForm,
  type InventoryFormData,
  ScannedItemsList,
  type ScannedItem,
} from '@/components/scanning/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useInventoryActions,
  useScannedItemConverter,
} from '@/hooks/use-inventory-submission'
import { useStoreState } from '@/lib/stores/store-context'

interface ManualInboundEntryProps {
  storeId?: string
  persistedItems?: ScannedItem[]
  onItemsChange?: (items: ScannedItem[]) => void
  onBatchSubmitted?: (result: any) => void
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
  persistedItems = [],
  onItemsChange,
  onBatchSubmitted,
  className = '',
}: ManualInboundEntryProps) {
  const { activeStore } = useStoreState()
  const storeId = propStoreId || activeStore?.store_id

  // Product selection state
  const [selectedProduct, setSelectedProduct] =
    useState<SelectedProduct | null>(null)

  // Form data for current item
  const [inventoryData, setInventoryData] = useState<InventoryFormData>({
    expiryDate: '',
    quantity: 1,
    price: 0,
  })

  // List of items to be submitted - use persisted items if provided
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>(persistedItems)

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

  // Sync with persisted items from parent
  useEffect(() => {
    setScannedItems(persistedItems)
  }, [persistedItems])

  // Update parent whenever items change
  useEffect(() => {
    onItemsChange?.(scannedItems)
  }, [scannedItems, onItemsChange])

  // Handle product selection from ManualBarcodeEntry
  const handleProductSelected = (barcode: string, productData: any) => {
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

    setScannedItems((prev) => [newItem, ...prev])

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
      scannedItems.map((item) => ({
        barcode: item.barcode,
        productName: item.productName,
        brand: item.brand,
        expiryDate: item.expiryDate,
        quantity: item.quantity,
        price: item.price,
      }))
    )

    submitBatch(
      productsToSubmit.map((product) => ({
        ...product,
        storeId: storeId,
        ocrExtractedDate: new Date().toISOString(),
        ocrConfidence: 1,
      })),
      {
        onSuccess: (result) => {
          setSubmissionResult({
            successCount: result.successCount,
            totalCount: productsToSubmit.length,
          })

          // Clear items through parent state management
          setScannedItems([])
          onItemsChange?.([])
          setShowSubmissionDialog(false)
          setShowSuccessDialog(true)

          onBatchSubmitted?.(result)
        },
        onError: (error) => {
          console.error('Batch submission failed:', error)
        },
      }
    )
  }

  const formatPrice = (price: number) => `€${price.toFixed(2)}`
  const canAddBatch =
    selectedProduct &&
    inventoryData.expiryDate &&
    inventoryData.quantity > 0 &&
    inventoryData.price > 0

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Entry Card */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Product Entry</CardTitle>
          <CardDescription>
            Add products to your inventory by searching or entering product
            details manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Selection Section */}
          {!selectedProduct ? (
            <ManualBarcodeEntry
              onProductSelected={handleProductSelected}
              mode="inbound"
              storeId={storeId}
            />
          ) : (
            <Card className="border-primary-200 bg-primary-50/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-primary-600" />
                      <h3 className="font-semibold text-lg">
                        Selected Product
                      </h3>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="font-medium">Name:</span>{' '}
                        {selectedProduct.productName}
                      </div>
                      {selectedProduct.brand && (
                        <div>
                          <span className="font-medium">Brand:</span>{' '}
                          {selectedProduct.brand}
                        </div>
                      )}
                      {selectedProduct.category && (
                        <div>
                          <span className="font-medium">Category:</span>{' '}
                          {selectedProduct.category}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Barcode:</span>{' '}
                        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                          {selectedProduct.barcode}
                        </code>
                      </div>
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
                <Button
                  onClick={handleClearSelection}
                  variant="outline"
                  size="lg"
                >
                  Clear
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recently Added Items */}
      {scannedItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your list of products</CardTitle>
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
              onItemUpdated={(updatedItem) => {
                setScannedItems((prev) =>
                  prev.map((item) =>
                    item.id === updatedItem.id ? updatedItem : item
                  )
                )
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {scannedItems.length === 0 && !selectedProduct && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Start by searching for a product using the barcode or product name
            search above. After selecting a product, you'll be able to add
            expiry date, quantity, and price.
          </AlertDescription>
        </Alert>
      )}

      {/* Submission Confirmation Dialog */}
      <Dialog
        open={showSubmissionDialog}
        onOpenChange={setShowSubmissionDialog}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              Review the items below before submitting them to your inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              You are about to submit {scannedItems.length} batch
              {scannedItems.length !== 1 ? 'es' : ''} to inventory:
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50">
              {scannedItems.map((item) => {
                const totalValue = item.quantity * item.price
                return (
                  <div
                    key={item.id}
                    className="flex justify-between items-start p-2 bg-white rounded border text-sm"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.productName}</div>
                      {item.brand && (
                        <div className="text-xs text-gray-600">
                          {item.brand}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Expires:{' '}
                        {new Date(item.expiryDate).toLocaleDateString()}
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

            <div className="border-t pt-3">
              <div className="flex justify-between items-center font-medium">
                <span>Total Items:</span>
                <span>
                  {scannedItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center font-medium">
                <span>Total Value:</span>
                <span>
                  {formatPrice(
                    scannedItems.reduce(
                      (sum, item) => sum + item.quantity * item.price,
                      0
                    )
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
        <Dialog
          open={showSuccessDialog}
          onOpenChange={setShowSuccessDialog}
        >
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
