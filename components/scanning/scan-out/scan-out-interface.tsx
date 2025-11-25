'use client'

import { RecipientSelector } from '@/components/donation/recipient-selector'
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
import { Typography } from '@/components/ui/typography'
import { useAutoOCRScanner } from '@/hooks/use-auto-ocr-scanner'
import { useOCRWithFallback } from '@/hooks/use-ocr-processing'
import { captureImageFromVideo } from '@/lib/api/ocr-client'
import { useStoreState } from '@/lib/stores/store-context'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, BarChart3, Check, Minus, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import type { ActionType, AvailableBatch } from '@/types/scanning'
import type { Database } from '@/types/supabase'
import type { ScannedItem } from '../shared'
import BatchSelectionList from '../shared/batch-selection-list'
import ScanningCamera from '../shared/scanning-camera'
import ActionTypeSelector from './action-type-selector'
import { useScanOutActions } from './use-scan-out-actions'

type batch = Database['inventory']['Tables']['batches']['Row']

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
  actionType: ActionType
  donationRecipientId?: string
  donationRecipientName?: string // For ad-hoc or display purposes
  disposalReason?: string
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

  // Global action type (default to 'sold')
  const [globalActionType, setGlobalActionType] = useState<ActionType>('sold')

  // Available batches for the current product
  const [availableBatches, setAvailableBatches] = useState<AvailableBatch[]>([])
  const [currentProduct, setCurrentProduct] = useState<CurrentProduct | null>(null)
  const [_selectedBatch, setSelectedBatch] = useState<AvailableBatch | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [_quantity, setQuantity] = useState<number>(1)

  // Check if auto-OCR is enabled via environment variable
  const isAutoOCREnabled = process.env.NEXT_PUBLIC_AUTO_OCR_ENABLED === 'true'

  // Auto-OCR scanner with intelligent pre-checks for batch selection
  const autoOCRScanner = useAutoOCRScanner({
    isEnabled:
      isAutoOCREnabled && // Feature flag check
      currentStep === 'batch-selection' &&
      availableBatches.length > 0,
    storeId: activeStore?.store_id || '',
    onExpiryDetected: async expiryInfo => {
      try {
        if (expiryInfo.extractedDate && availableBatches.length > 0) {
          // Try to match the captured date to an available batch
          const matchedBatch = matchBatchByExpiry(availableBatches, expiryInfo.extractedDate)

          if (matchedBatch) {
            handleBatchSelected(matchedBatch)
            setOcrError(null)
          } else {
            // No matching batch found
            setOcrError(
              t('noBatchFoundWithExpiry', {
                date: expiryInfo.extractedDate,
              }),
            )
          }
        } else if (!expiryInfo.extractedDate) {
          setOcrError(t('couldNotDetectExpiry'))
        }
      } catch (error) {
        console.error('Auto-OCR expiry processing failed:', error)
        setOcrError(error instanceof Error ? error.message : t('errorProcessingExpiry'))
      }
    },
    maxAttempts: 10,
    preCheckIntervalMs: 500,
    debug: process.env.NODE_ENV === 'development',
  })

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

        // Use RPC function to get batches (handles complex join properly)
        const supabase = createClient()
        const { data: batchesData, error } = await supabase
          .schema('inventory') // ← Add this to specify the schema
          .rpc('get_available_batches_by_product', {
            p_product_id: productId,
            p_store_id: activeStore.store_id,
          })

        if (error) {
          console.error('Error fetching batches by product_id:', error)
          return
        }

        // Transform the flat RPC result to match AvailableBatch type with nested batch
        batches =
          batchesData?.map(
            (rpcBatch: {
              batch_id: string
              batch_number: string
              product_id: string
              store_id: string
              expiry_date: string
              current_quantity: number
              available_quantity: number | null
              initial_quantity: number
              cost_price: number
              selling_price: number
              location_code: string | null
              status: string
              verification_status: string | null
              created_at: string
              product_name: string
              brand_name: string
              barcode: string
            }) => ({
              batch: {
                batch_id: rpcBatch.batch_id,
                batch_number: rpcBatch.batch_number,
                product_id: rpcBatch.product_id,
                store_id: rpcBatch.store_id,
                expiry_date: rpcBatch.expiry_date,
                current_quantity: rpcBatch.current_quantity,
                available_quantity: rpcBatch.available_quantity ?? rpcBatch.current_quantity,
                initial_quantity: rpcBatch.initial_quantity,
                cost_price: rpcBatch.cost_price,
                selling_price: rpcBatch.selling_price,
                location_code: rpcBatch.location_code,
                status: rpcBatch.status,
                verification_status: rpcBatch.verification_status,
                created_at: rpcBatch.created_at,
                // Additional required fields not returned by RPC (for full BatchRow compliance)
                received_date: null,
                reserved_quantity: null,
                updated_at: rpcBatch.created_at,
                manufacture_date: null,
                supplier: null,
                ocr_extracted_date: null,
                ocr_confidence: null,
                processing_batch_id: null,
                batch_source: null,
                scanned_barcode: null,
                scan_confidence: null,
                created_by: null,
              } as batch,
              products: {
                product_name: rpcBatch.product_name,
                brand_name: rpcBatch.brand_name || '',
                barcode: rpcBatch.barcode || '',
              },
            }),
          ) || []
      } else {
        // Regular barcode lookup - already returns nested structure
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
        // Add to pending list with default quantity of 1 and current global action type
        const newItem: PendingItem = {
          id: batch.batch.batch_id, // ← Access via batch.batch
          batchId: batch.batch.batch_id, // ← Access via batch.batch
          barcode: currentProduct.barcode,
          productName: batch.products.product_name,
          brand: batch.products.brand_name,
          quantity: 1,
          maxQuantity: Number(batch.batch.current_quantity), // ← Access via batch.batch
          expiryDate: batch.batch.expiry_date, // ← Access via batch.batch
          price: Number(batch.batch.cost_price), // ← Access via batch.batch
          timestamp: new Date(),
          actionType: globalActionType, // Use the global action type
        }

        setPendingItems(prev => {
          // Check if this batch is already in the list
          const existingIndex = prev.findIndex(
            item => item.batchId === batch.batch.batch_id, // ← Access via batch.batch
          )
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
    [currentProduct, globalActionType],
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

  // Update item action type in the pending list
  const updateItemActionType = (batchId: string, actionType: ActionType) => {
    setPendingItems(prev =>
      prev.map(item =>
        item.batchId === batchId
          ? {
              ...item,
              actionType,
              // Clear action-specific fields when changing action type
              donationRecipientId: actionType === 'donate' ? item.donationRecipientId : undefined,
              disposalReason: actionType === 'dispose' ? item.disposalReason : undefined,
            }
          : item,
      ),
    )
  }

  // Update donation recipient for an item
  const updateItemDonationRecipient = (
    batchId: string,
    donationRecipientId: string,
    donationRecipientName: string,
  ) => {
    setPendingItems(prev =>
      prev.map(item =>
        item.batchId === batchId ? { ...item, donationRecipientId, donationRecipientName } : item,
      ),
    )
  }

  // Update disposal reason for an item
  const updateItemDisposalReason = (batchId: string, disposalReason: string) => {
    setPendingItems(prev =>
      prev.map(item => (item.batchId === batchId ? { ...item, disposalReason } : item)),
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
    // 🎯 Simplified: Just show manual entry and go back to scanning
    // The scannedProduct in the Zustand store will automatically pre-fill the form!
    setShowManualEntry(true)
    setCurrentStep('scanning')

    // Clear batch selection state
    setAvailableBatches([])
    setSelectedBatch(null)
    setQuantity(1)
    // Note: We don't clear currentProduct or the store's scannedProduct
    // This allows the form to be pre-filled with existing data
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
    // Validate donation items have recipients selected
    const donationItemsWithoutRecipient = pendingItems.filter(
      item => item.actionType === 'donate' && !item.donationRecipientId,
    )

    if (donationItemsWithoutRecipient.length > 0) {
      const itemNames = donationItemsWithoutRecipient.map(item => item.productName).join(', ')
      toast.error(
        t('donationRecipientRequired') || `Please select a donation recipient for: ${itemNames}`,
      )
      console.error('[SCAN-OUT-UI] Validation failed: Donation items missing recipients', {
        count: donationItemsWithoutRecipient.length,
        items: donationItemsWithoutRecipient.map(item => ({
          batchId: item.batchId,
          productName: item.productName,
          actionType: item.actionType,
        })),
      })
      return // Prevent submission
    }

    // Validate disposal items have reasons
    const disposalItemsWithoutReason = pendingItems.filter(
      item => item.actionType === 'dispose' && !item.disposalReason?.trim(),
    )

    if (disposalItemsWithoutReason.length > 0) {
      const itemNames = disposalItemsWithoutReason.map(item => item.productName).join(', ')
      toast.error(
        t('disposalReasonRequired') || `Please provide a disposal reason for: ${itemNames}`,
      )
      console.error('[SCAN-OUT-UI] Validation failed: Disposal items missing reasons', {
        count: disposalItemsWithoutReason.length,
        items: disposalItemsWithoutReason.map(item => ({
          batchId: item.batchId,
          productName: item.productName,
          actionType: item.actionType,
        })),
      })
      return // Prevent submission
    }

    const checkoutItems = pendingItems.map(item => ({
      batchId: item.batchId,
      quantityRemoved: item.quantity,
      actionType: item.actionType, // Pass the action type (sold/donate/dispose)
      reason: 'scan-out',
      storeId: activeStore?.store_id || '',
      notes: t('batchRemovalNote', {
        productName: item.productName,
        quantity: item.quantity,
      }),
      donationRecipientId: item.donationRecipientId, // Pass donation recipient UUID if provided
      donationRecipientName: item.donationRecipientName, // Pass donation recipient name (for ad-hoc or display)
      disposalReason: item.disposalReason, // Pass disposal reason if provided
    }))

    // Debug log to verify donation recipient data
    checkoutItems.forEach((item, index) => {
      if (item.actionType === 'donate') {
        console.log(`[SCAN-OUT-UI] Donation item #${index + 1}:`, {
          donationRecipientId: item.donationRecipientId,
          donationRecipientName: item.donationRecipientName,
          hasRecipientId: !!item.donationRecipientId,
          hasRecipientName: !!item.donationRecipientName,
        })
      }
    })

    console.log('[SCAN-OUT-UI] Submitting checkout:', {
      itemCount: checkoutItems.length,
      storeId: activeStore?.store_id,
      actionBreakdown: actionBreakdown.map(a => ({
        action: a.actionType,
        count: a.count,
        value: a.value,
      })),
      items: checkoutItems,
      pendingItems: pendingItems.map(item => ({
        batchId: item.batchId,
        productName: item.productName,
        quantity: item.quantity,
        actionType: item.actionType,
        maxQuantity: item.maxQuantity,
      })),
    })

    // Submit the checkout/removal to inventory
    submitCheckout(checkoutItems, {
      onSuccess: result => {
        console.log('[SCAN-OUT-UI] Submission successful:', {
          result,
          successCount: result.successCount,
          failureCount: result.failureCount,
          totalAttempted: pendingItems.length,
          results: result.results,
        })

        // Store the result for the success dialog
        setSubmissionResult({
          successCount: result.successCount || 0,
          totalCount: pendingItems.length,
        })

        // Only clear items and show success if at least one item succeeded
        if (result.successCount && result.successCount > 0) {
          // Notify parent with all items
          pendingItems.forEach(item => {
            onItemRemoved?.(item)
          })

          // Clear the batch and close submission dialog
          setPendingItems([])
          setShowSubmissionDialog(false)

          // Show success dialog
          setShowSuccessDialog(true)
        } else {
          // All items failed - keep dialog open and show error
          console.error('[SCAN-OUT-UI] All items failed to process')
          // Dialog stays open so user can see what happened and retry
        }
      },
      onError: error => {
        console.error('[SCAN-OUT-UI] Submission failed:', {
          error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          attemptedItems: checkoutItems,
        })
        // Dialog stays open so user can retry or cancel
      },
    })
  }

  const formatPrice = (price: number) => `€${price.toFixed(2)}`

  // Calculate totals for pending items
  const totalItems = pendingItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = pendingItems.reduce((sum, item) => sum + item.quantity * item.price, 0)

  // Calculate breakdown by action type
  const actionBreakdown = pendingItems.reduce(
    (acc, item) => {
      const existingAction = acc.find(a => a.actionType === item.actionType)
      if (existingAction) {
        existingAction.count += item.quantity
        existingAction.value += item.quantity * item.price
        existingAction.items.push(item)
      } else {
        acc.push({
          actionType: item.actionType,
          count: item.quantity,
          value: item.quantity * item.price,
          items: [item],
        })
      }
      return acc
    },
    [] as Array<{
      actionType: ActionType
      count: number
      value: number
      items: PendingItem[]
    }>,
  )

  return (
    <div className="space-y-4">
      {/* Global Action Type Selector */}
      <div className="px-4">
        <ActionTypeSelector
          selectedAction={globalActionType}
          onActionChange={setGlobalActionType}
        />
      </div>

      {/* Step 1: Barcode Scanning */}
      {currentStep === 'scanning' && (
        <div className="space-y-4">
          <ScanningCamera
            mode="barcode"
            onBarcodeScanned={handleCustomBarcodeScanned}
            onScanError={_error => {}}
            showManualEntry={showManualEntry}
            onToggleManualEntry={() => setShowManualEntry(!showManualEntry)}
            onManualProductSelected={(barcode: string) => {
              handleCustomBarcodeScanned(barcode)
              setShowManualEntry(false)
            }}
            onCloseManualEntry={() => setShowManualEntry(false)}
            manualEntryMode="scan-out"
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
            isOCRProcessing={isOCRProcessing || autoOCRScanner.isAnalyzing}
            ocrError={ocrError}
            onClearOCRError={clearOCRError}
            title={t('captureExpiryDate')}
            subtitle={t('pointCameraAtExpiry')}
            autoStart={true}
            autoOCRState={isAutoOCREnabled ? autoOCRScanner : undefined}
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
                className="flex items-start justify-between p-3 bg-gray-50 rounded-2xl border"
              >
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-2">
                    <Typography>
                      {item.maxQuantity} {t('available')}
                    </Typography>
                    <ActionTypeSelector
                      selectedAction={item.actionType}
                      onActionChange={actionType => updateItemActionType(item.batchId, actionType)}
                      variant="compact"
                    />
                  </div>
                  <Typography>{item.productName}</Typography>
                  <Typography>
                    {item.brand} • {t('expires')}:{' '}
                    {item.expiryDate
                      ? new Date(item.expiryDate).toLocaleDateString()
                      : 'No date set'}
                  </Typography>
                  <Typography>
                    {formatPrice(item.price)} × {item.quantity} ={' '}
                    {formatPrice(item.price * item.quantity)}
                  </Typography>

                  {/* Action-specific inputs */}
                  {item.actionType === 'donate' && (
                    <div className="mt-2">
                      {!item.donationRecipientId && (
                        <Typography color="destructive">
                          {t('selectRecipientRequired') || 'Please select a recipient'}
                        </Typography>
                      )}
                      <RecipientSelector
                        storeId={activeStore?.store_id}
                        selectedRecipientId={item.donationRecipientId}
                        selectedRecipientName={item.donationRecipientName}
                        onRecipientSelect={(recipientId, recipientName) => {
                          updateItemDonationRecipient(item.batchId, recipientId, recipientName)
                        }}
                        className={`p-2 bg-white dark:bg-gray-800 rounded-lg border`}
                      />
                    </div>
                  )}
                  {item.actionType === 'dispose' && (
                    <div className="mt-2">
                      <Input
                        type="text"
                        placeholder={
                          t('disposalReasonPlaceholder') || 'Reason (e.g., Expired, Moldy)'
                        }
                        value={item.disposalReason || ''}
                        onChange={e => updateItemDisposalReason(item.batchId, e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 justify-center">
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
              <DialogTitle>
                {actionBreakdown.length === 1
                  ? actionBreakdown[0].actionType === 'sold'
                    ? t('confirmSale')
                    : actionBreakdown[0].actionType === 'donate'
                      ? t('confirmDonation')
                      : t('confirmDisposal')
                  : t('confirmCheckout')}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                {t('reviewItemsBeforeRemoval')}{' '}
                {t('aboutToRemoveItems', { count: pendingItems.length })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Action Breakdown Summary */}
              {actionBreakdown.length > 1 && (
                <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-2xl border">
                  {actionBreakdown.map(action => {
                    const colorClass =
                      action.actionType === 'sold'
                        ? 'bg-primary-100 text-primary-700 border-primary-200'
                        : action.actionType === 'donate'
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : 'bg-red-100 text-red-700 border-red-200'
                    return (
                      <div
                        key={action.actionType}
                        className={`p-2 flex gap-1 rounded-xl border ${colorClass}`}
                      >
                        <Typography>{t(`actions.${action.actionType}`)}</Typography>
                        <Typography>{action.count}</Typography>
                        <Typography variant="extraSmall">{formatPrice(action.value)}</Typography>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Summary List */}
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-2xl p-3 bg-gray-50">
                {pendingItems.map(item => {
                  const itemTotal = item.quantity * item.price
                  const actionColor =
                    item.actionType === 'sold'
                      ? 'text-primary-700'
                      : item.actionType === 'donate'
                        ? 'text-blue-700'
                        : 'text-red-700'
                  const actionBg =
                    item.actionType === 'sold'
                      ? 'bg-primary-50'
                      : item.actionType === 'donate'
                        ? 'bg-blue-50'
                        : 'bg-red-50'
                  return (
                    <div
                      key={item.batchId}
                      className={`flex justify-between items-start p-2 rounded-2xl border ${actionBg}`}
                    >
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Typography>{item.productName}</Typography>
                          <Typography variant="extraSmall" className={`${actionColor}`}>
                            ({t(`actions.${item.actionType}`)})
                          </Typography>
                        </div>
                        {item.brand && <Typography variant="extraSmall">{item.brand}</Typography>}
                        <Typography variant="extraSmall">
                          {t('expires')}:{' '}
                          {item.expiryDate
                            ? new Date(item.expiryDate).toLocaleDateString()
                            : 'No date set'}
                        </Typography>
                      </div>
                      <div className="text-right flex flex-col gap-1">
                        <Typography variant="extraSmall" className={`${actionColor}`}>
                          -{item.quantity}x {formatPrice(item.price)}
                        </Typography>
                        <Typography variant="extraSmall">
                          {t('remove')}: {formatPrice(itemTotal)}
                        </Typography>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Total Summary */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <Typography>{t('totalItemsRemoved')}:</Typography>
                  <Typography color="destructive">
                    -{pendingItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </Typography>
                </div>
                <div className="flex justify-between items-center">
                  <Typography>{t('totalValueRemoved')}:</Typography>
                  <Typography color="destructive">
                    -
                    {formatPrice(
                      pendingItems.reduce((sum, item) => sum + item.quantity * item.price, 0),
                    )}
                  </Typography>
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
