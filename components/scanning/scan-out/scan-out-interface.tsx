'use client'

import { AlertCircle, BarChart3, Check, Minus, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

interface PendingItem extends ScannedItem {
  batchId: string
  maxQuantity: number
}

interface ScanOutInterfaceProps {
  onItemRemoved?: (item: ScannedItem) => void
  className?: string
}

export default function ScanOutInterface({ onItemRemoved }: ScanOutInterfaceProps) {
  const t = useTranslations('scanOut')
  const { activeStore } = useStoreState()
  const { submitCheckout, isSubmittingCheckout, findAvailableBatches, matchBatchByExpiry } =
    useScanOutActions()

  // OCR processing hook for expiry date capture
  // const { processExpiryDate, isLoading: isOCRProcessing, isBackendHealthy } = useOCRWithFallback()
  const { processExpiryDate, isLoading: isOCRProcessing } = useOCRWithFallback() // debug

  // Dialog states
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<{
    successCount: number
    totalCount: number
  } | null>(null)
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])

  // Workflow states
  type ScanOutStep = 'scanning' | 'batch-selection'
  const [currentStep, setCurrentStep] = useState<ScanOutStep>('scanning')
  const [showManualEntry, setShowManualEntry] = useState(false)

  // Available batches for the current product
  const [availableBatches, setAvailableBatches] = useState<AvailableBatch[]>([])
  const [currentProduct, setCurrentProduct] = useState<CurrentProduct | null>(null)
  const [_selectedBatch, setSelectedBatch] = useState<AvailableBatch | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [_quantity, setQuantity] = useState<number>(1)

  // Custom barcode scan handler for scan-out
  const handleCustomBarcodeScanned = async (barcode: string, _productData?: unknown) => {
    if (!activeStore) {
      console.error(t('noActiveStore'))
      return
    }

    try {
      let batches: AvailableBatch[] = []

      // Check if this is an internal product ID (from manual search)
      if (barcode.startsWith('INTERNAL-')) {
        const productId = barcode.replace('INTERNAL-', '')

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
              product_name: (batch.products as unknown as ProductData)?.name || t('unknownProduct'),
              brand_name: (batch.products as unknown as ProductData)?.brand || t('unknownBrand'),
              barcode: (batch.products as unknown as ProductData)?.barcode || '',
            },
          })) || []
      } else {
        // Regular barcode lookup
        batches = await findAvailableBatches(barcode, activeStore.store_id)
      }

      if (batches.length === 0) {
        return
      }

      setAvailableBatches(batches)
      setCurrentProduct({
        barcode,
        productName: batches[0]?.products.product_name || t('unknownProduct'),
      })
      setCurrentStep('batch-selection')
      setSelectedBatch(null)
    } catch (error) {
      console.error('Failed to find available batches:', error)
    }
  }

  const handleBatchSelected = useCallback(
    (batch: AvailableBatch) => {
      if (currentProduct) {
        // Add to pending list with default quantity of 1
        const newItem: PendingItem = {
          id: batch.batch_id,
          batchId: batch.batch_id,
          barcode: currentProduct.barcode,
          productName: batch.products.product_name,
          brand: batch.products.brand_name,
          quantity: 1,
          maxQuantity: batch.current_quantity,
          expiryDate: batch.expiry_date,
          price: batch.cost_price,
          timestamp: new Date(),
        }

        setPendingItems(prev => {
          // Check if this batch is already in the list
          const existingIndex = prev.findIndex(item => item.batchId === batch.batch_id)
          if (existingIndex >= 0) {
            // Increment quantity if already exists
            const updated = [...prev]
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: Math.min(
                updated[existingIndex].quantity + 1,
                updated[existingIndex].maxQuantity,
              ),
            }
            return updated
          }
          // Add new item to the beginning of the list
          return [newItem, ...prev]
        })

        // Reset to scanning for next product
        setCurrentStep('scanning')
        setCurrentProduct(null)
        setAvailableBatches([])
        setSelectedBatch(null)
      }
    },
    [currentProduct],
  )

  // Update item quantity in the pending list
  const updateItemQuantity = (batchId: string, newQuantity: number) => {
    setPendingItems(prev =>
      prev.map(item =>
        item.batchId === batchId
          ? {
            ...item,
            quantity: Math.max(1, Math.min(newQuantity, item.maxQuantity)),
          }
          : item,
      ),
    )
  }

  // Remove item from pending list
  const removeItemFromList = (batchId: string) => {
    setPendingItems(prev => prev.filter(item => item.batchId !== batchId))
  }

  // Submit all pending items
  const handleSubmitAll = () => {
    if (pendingItems.length === 0) return
    setShowSubmissionDialog(true)
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
      setOcrError(t('noActiveStore'))
      return
    }

    try {
      setOcrError(null)

      const videoElement = document.querySelector('video') as HTMLVideoElement
      if (!videoElement || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
        throw new Error(t('cameraNotReady'))
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
          setOcrError(
            t('noBatchFoundWithExpiry', {
              date: result.expiryDateInfo.extractedDate,
            }),
          )
        }
      } else {
        setOcrError(result.error?.message || t('ocrProcessingFailed'))
      }
    } catch (error) {
      setOcrError(error instanceof Error ? error.message : t('ocrProcessingFailed'))
    }
  }

  const clearOCRError = () => {
    setOcrError(null)
  }

  const handleConfirmSubmission = () => {
    // Submit the checkout/removal to inventory
    submitCheckout(
      pendingItems.map(item => ({
        batchId: item.batchId,
        quantityRemoved: item.quantity,
        reason: 'scan-out',
        storeId: activeStore?.store_id || '',
        notes: t('batchRemovalNote', {
          productName: item.productName,
          quantity: item.quantity,
        }),
      })),
      {
        onSuccess: result => {
          // Store the result for the success dialog
          setSubmissionResult({
            successCount: result.successCount || pendingItems.length,
            totalCount: pendingItems.length,
          })

          // Notify parent with all items
          pendingItems.forEach(item => {
            onItemRemoved?.(item)
          })

          // Clear the batch and close submission dialog
          setPendingItems([])
          setShowSubmissionDialog(false)

          // Show success dialog
          setShowSuccessDialog(true)
        },
        onError: _error => {
          // Dialog stays open so user can retry or cancel
        },
      },
    )
  }

  const formatPrice = (price: number) => `€${price.toFixed(2)}`

  // Calculate totals for pending items
  const totalItems = pendingItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = pendingItems.reduce((sum, item) => sum + item.quantity * item.price, 0)

  return (
    <div className="space-y-4">
      {/* Step 1: Barcode Scanning */}
      {currentStep === 'scanning' && (
        <div className="space-y-4">
          <ScanningCamera
            mode="barcode"
            onBarcodeScanned={handleCustomBarcodeScanned}
            onScanError={_error => { }}
            showManualEntry={showManualEntry}
            onToggleManualEntry={() => setShowManualEntry(!showManualEntry)}
            onManualProductSelected={(barcode: string) => {
              handleCustomBarcodeScanned(barcode)
              setShowManualEntry(false)
            }}
            onCloseManualEntry={() => setShowManualEntry(false)}
            manualEntryMode="outbound"
            storeId={activeStore?.store_id}
            title={t('scanProductToRemove')}
            subtitle={t('pointCameraAtBarcode')}
          />
        </div>
      )}

      {/* Step 2: Batch Selection */}
      {currentStep === 'batch-selection' && currentProduct && (
        <>
          {/* Main Selection Interface */}
          <ScanningCamera
            mode="ocr"
            onOCRCapture={handleOCRExpiryCapture}
            isOCRProcessing={isOCRProcessing}
            ocrError={ocrError}
            onClearOCRError={clearOCRError}
            // isBackendHealthy={isBackendHealthy}
            title={t('captureExpiryDate')}
            subtitle={t('pointCameraAtExpiry')}
            autoStart={true}
          />

          <BatchSelectionList
            batches={availableBatches}
            onBatchSelected={handleBatchSelected}
            selectedBatchId={undefined}
          />

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleBackToScanning}
              className="flex items-center gap-2"
            >
              ← {t('backToChangeProduct')}
            </Button>
          </div>
        </>
      )}

      {pendingItems.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex justify-between items-center">
              <span>{t('itemsToRemove', { count: totalItems })}</span>
              <span className="text-sm font-normal">
                {t('total')}: {formatPrice(totalValue)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingItems.map(item => (
              <div
                key={item.batchId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {item.maxQuantity} {t('available')}
                  </div>
                  <div className="font-medium">{item.productName}</div>
                  <div className="text-sm text-gray-500">
                    {item.brand} • {t('expires')}: {new Date(item.expiryDate).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatPrice(item.price)} × {item.quantity} ={' '}
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateItemQuantity(item.batchId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e =>
                      updateItemQuantity(item.batchId, parseInt(e.target.value, 10) || 1)
                    }
                    className="w-12 text-center border rounded-2xl px-1 py-1 text-sm"
                    min="1"
                    max={item.maxQuantity}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateItemQuantity(item.batchId, item.quantity + 1)}
                    disabled={item.quantity >= item.maxQuantity}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeItemFromList(item.batchId)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex gap-2 pt-3">
              <Button variant="outline" onClick={() => setPendingItems([])} className="flex-1">
                {t('clearAll')}
              </Button>
              <Button
                onClick={handleSubmitAll}
                className="flex-1 bg-primary-900 hover:bg-primary-700 text-white"
              >
                {t('submitAll', { count: totalItems })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showSubmissionDialog && (
        <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('confirmCheckout')}</DialogTitle>
              <DialogDescription>{t('reviewItemsBeforeRemoval')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                {t('aboutToRemoveItems', { count: pendingItems.length })}
              </div>

              {/* Summary List */}
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-2xl p-3 bg-gray-50">
                {pendingItems.map(item => {
                  const itemTotal = item.quantity * item.price
                  return (
                    <div
                      key={item.batchId}
                      className="flex justify-between items-start p-2 bg-white rounded-2xl border text-sm"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.productName}</div>
                        {item.brand && <div className="text-xs text-gray-600">{item.brand}</div>}
                        <div className="text-xs text-gray-500">
                          {t('expires')}: {new Date(item.expiryDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">
                          -{item.quantity}x {formatPrice(item.price)}
                        </div>
                        <div className="text-xs text-red-500">
                          {t('remove')}: {formatPrice(itemTotal)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Total Summary */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center font-medium">
                  <span>{t('totalItemsRemoved')}:</span>
                  <span className="text-red-600">
                    -{pendingItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center font-medium">
                  <span>{t('totalValueRemoved')}:</span>
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
                {t('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmSubmission}
                disabled={isSubmittingCheckout}
              >
                <Check className="w-4 h-4 mr-2" />
                {isSubmittingCheckout ? t('processing') : t('confirmRemoval')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showSuccessDialog && submissionResult && (
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="w-6 h-6 text-primary-600 stroke-5 border-2 border-primary-600 rounded-full p-[3px] bg-primary-100" />
                {t('inventoryUpdatedSuccessfully')}
              </DialogTitle>
              <DialogDescription>
                {submissionResult.successCount === submissionResult.totalCount
                  ? t('successfullyRemoved', {
                    count: submissionResult.successCount,
                  })
                  : t('partiallyRemoved', {
                    success: submissionResult.successCount,
                    total: submissionResult.totalCount,
                  })}
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
                {t('continueScanning')}
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
                {t('viewInDashboard')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {!availableBatches.length && currentProduct && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('noInventoryAvailable')}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
