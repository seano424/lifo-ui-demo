'use client'

import { AlertCircle, ArrowRight, BarChart3, Check, RefreshCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import type { BarcodeDetection } from '@/components/barcode/barcode-scanner'
// Import existing hooks and utilities
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
import { useInventoryActions, useScannedItemConverter } from '@/hooks/use-inventory-submission'
import { useOCRWithFallback } from '@/hooks/use-ocr-processing'
import { useProductLookup } from '@/hooks/use-product-lookup'
import { captureImageFromVideo } from '@/lib/api/ocr-client'
import {
  useCanGoBack,
  useExpiryInfo,
  usePreviousStepName,
  useScannedProduct,
  useScanningActions,
  useScanningStep,
} from '@/lib/stores/scanning-workflow-store'
import { useStoreState } from '@/lib/stores/store-context'
// Import shared components
import {
  InventoryForm,
  type InventoryFormData,
  ProductCard,
  type ScannedItem,
  ScannedItemsList,
  ScanningCamera,
  ScanningControls,
} from './shared'

interface ScanningProps {
  onItemAdded?: (item: ScannedItem) => void
  className?: string
}

type UIStep = 'camera-barcode' | 'product-success' | 'camera-expiry' | 'batch-success'

export default function ScanningInterface({ onItemAdded, className }: ScanningProps) {
  const t = useTranslations('scanningInterface')

  // Existing workflow state
  const currentStep = useScanningStep()
  const scannedProduct = useScannedProduct()
  const expiryInfo = useExpiryInfo()
  const canGoBack = useCanGoBack()
  const previousStepName = usePreviousStepName()
  const { activeStore } = useStoreState()

  // Store actions
  const workflowActions = useScanningActions()

  // OCR processing
  const { processExpiryDate, isLoading: isOCRProcessing, isBackendHealthy } = useOCRWithFallback()

  // Inventory submission
  const { submitBatch, isSubmittingBatch } = useInventoryActions()
  const { convertMultipleScannedItems } = useScannedItemConverter()

  // Local UI state
  const [uiStep, setUIStep] = useState<UIStep>('camera-barcode')
  const [showManualBarcode, setShowManualBarcode] = useState(false)
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [lookupBarcode, setLookupBarcode] = useState<string | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)

  // Form data
  const [inventoryData, setInventoryData] = useState<InventoryFormData>({
    expiryDate: '',
    quantity: 1,
    price: 0,
  })

  // Dialog states
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<{
    successCount: number
    totalCount: number
  } | null>(null)

  // Product lookup
  const {
    data: lookupResult,
    isLoading: isLookingUp,
    error: lookupError,
  } = useProductLookup(lookupBarcode, !!lookupBarcode)

  // Initialize store
  useEffect(() => {
    if (activeStore) {
      workflowActions.setStoreId(activeStore.store_id)
    }
  }, [activeStore, workflowActions])

  // Update workflow store when lookup completes
  useEffect(() => {
    if (lookupResult && lookupBarcode) {
      workflowActions.setProductLookupResult(lookupResult)
    }
  }, [lookupResult, lookupBarcode, workflowActions])

  // Sync workflow state with UI
  useEffect(() => {
    switch (currentStep) {
      case 'barcode':
        setUIStep('camera-barcode')
        setShowManualBarcode(false)
        if (!scannedProduct) {
          setLookupBarcode(null)
        }
        setInventoryData({
          expiryDate: '',
          quantity: 1,
          price: 0,
        })
        break
      case 'product':
        if (scannedProduct?.productName) {
          setUIStep('product-success')
          if (scannedProduct.lookupResult?.product) {
            setInventoryData(prev => ({ ...prev, price: 2.99 }))
          }
        }
        break
      case 'ocr':
        setUIStep('camera-expiry')
        break
      case 'confirmation':
        setUIStep('camera-expiry')
        if (expiryInfo?.extractedDate) {
          const formattedDate = expiryInfo.extractedDate.split('T')[0]
          setInventoryData(prev => ({ ...prev, expiryDate: formattedDate }))
        }
        break
      case 'complete':
        setUIStep('camera-barcode')
        break
    }
  }, [currentStep, scannedProduct, expiryInfo])

  // Handle barcode scan
  const handleScan = (barcode: string, detection?: BarcodeDetection) => {
    workflowActions.setBarcodeScanned(barcode, detection)
    setLookupBarcode(barcode)
    setShowManualBarcode(false)
  }

  // Handle scan error
  const handleError = (error: Error) => {
    workflowActions.setError(error.message)
  }

  // Handle manual product selection
  const handleManualProductSelected = (barcode: string) => {
    setLookupBarcode(barcode)
    setShowManualBarcode(false)
  }

  // Handle go back
  const handleGoBack = () => {
    workflowActions.goBackStep()
    setShowManualBarcode(false)
  }

  // Handle OCR capture
  const handleOCRCapture = async () => {
    if (!activeStore?.store_id) {
      workflowActions.setError('No active store selected')
      return
    }

    setOcrError(null)
    workflowActions.setExpiryDateProcessing(true)

    try {
      const videoElement = document.querySelector('video') as HTMLVideoElement
      if (!videoElement || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
        throw new Error('Camera not ready')
      }

      const imageBlob = await captureImageFromVideo(videoElement)
      const result = await processExpiryDate(imageBlob, activeStore.store_id, {
        confidenceThreshold: 0.65,
        maxProcessingTimeMs: 5000,
      })

      if (result.success && result.expiryDateInfo) {
        workflowActions.setExpiryDateResult(result.expiryDateInfo)
        if (result.expiryDateInfo.extractedDate) {
          const formattedDate = result.expiryDateInfo.extractedDate.split('T')[0]
          setInventoryData(prev => ({ ...prev, expiryDate: formattedDate }))
        }
        setOcrError(null)
      } else {
        setOcrError(result.error?.message || 'OCR processing failed')
        workflowActions.setExpiryDateProcessing(false)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to capture image'
      setOcrError(errorMessage)
      workflowActions.setError(errorMessage)
      workflowActions.setExpiryDateProcessing(false)
    }
  }

  // Handle form submission
  const handleInventoryFormSubmit = () => {
    if (inventoryData.expiryDate) {
      workflowActions.setManualExpiryDate(inventoryData.expiryDate)
    }
  }

  // Handle add to inventory
  const handleAddToInventory = () => {
    if (scannedProduct && inventoryData.expiryDate) {
      const newItem: ScannedItem = {
        id: Date.now().toString(),
        barcode: scannedProduct.barcode,
        productName: scannedProduct.productName || 'Unknown Product',
        brand: scannedProduct.brand,
        expiryDate: inventoryData.expiryDate,
        quantity: inventoryData.quantity,
        price: inventoryData.price,
        timestamp: new Date(),
      }
      setScannedItems(prev => [newItem, ...prev])
      onItemAdded?.(newItem)

      // Reset for next item
      workflowActions.resetWorkflow()
      setLookupBarcode(null)
      setInventoryData({
        expiryDate: '',
        quantity: 1,
        price: 0,
      })
      setShowManualBarcode(false)
    }

    workflowActions.setBatchData({
      quantity: inventoryData.quantity,
      costPrice: inventoryData.price,
      sellingPrice: inventoryData.price * 1.3,
    })
    workflowActions.completeWorkflow()
  }

  // Handle final submission of all scanned items
  const handleFinalSubmission = () => {
    setShowSubmissionDialog(true)
  }

  const handleConfirmSubmission = () => {
    // Convert scanned items to the format expected by the inventory submission
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
          setScannedItems([])
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

  // Format price helper
  const formatPrice = (price: number) => `€${price.toFixed(2)}`

  return (
    <div className={`bg-white min-h-screen flex flex-col gap-4 ${className}`}>
      <div className="w-full">
        <div className="px-4 space-y-4">
          {/* Step 1: Barcode Scanning */}
          {uiStep === 'camera-barcode' && (
            <>
              {/* Camera Interface */}
              <ScanningCamera
                mode="barcode"
                title={scannedProduct ? t('camera.scanDifferentProduct') : t('camera.scanProduct')}
                onBarcodeScanned={handleScan}
                onScanError={handleError}
                showManualEntry={showManualBarcode}
                onToggleManualEntry={() => setShowManualBarcode(!showManualBarcode)}
                onManualProductSelected={handleManualProductSelected}
                onCloseManualEntry={() => setShowManualBarcode(false)}
                autoStart
              />

              {/* Selected Product Display */}
              {scannedProduct && (
                <ProductCard
                  product={{
                    barcode: scannedProduct.barcode,
                    productName: scannedProduct.productName,
                    brand: scannedProduct.brand,
                  }}
                  mode="selected"
                  showRemoveButton
                  showProceedButton
                  onRemove={() => {
                    workflowActions.resetWorkflow()
                    setLookupBarcode(null)
                  }}
                  onProceed={() => workflowActions.setCurrentStep('ocr')}
                />
              )}
            </>
          )}

          {/* Step 2: Product Success */}
          {uiStep === 'product-success' && scannedProduct && (
            <div className="space-y-4">
              {/* Lookup Status */}
              {lookupError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t('lookupErrors.lookupFailed', { error: lookupError.message })}
                  </AlertDescription>
                </Alert>
              )}

              <ProductCard
                product={{
                  barcode: scannedProduct.barcode,
                  productName: scannedProduct.productName,
                  brand: scannedProduct.brand,
                }}
              />

              {!isLookingUp && !lookupError && scannedProduct.lookupResult && (
                <>
                  {scannedProduct.lookupResult.found ? (
                    <Alert>
                      <Check className="w-6 h-6 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
                      <AlertDescription>{t('product.productFound')}</AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{t('product.productNotFound')}</AlertDescription>
                    </Alert>
                  )}

                  <Alert>
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                    <AlertDescription>{t('product.autoProceeding')}</AlertDescription>
                  </Alert>
                </>
              )}
            </div>
          )}

          {/* Step 3: Expiry Date Scanning */}
          {uiStep === 'camera-expiry' && (
            <div className="space-y-4">
              {/* Camera for OCR */}
              {!inventoryData.expiryDate && (
                <ScanningCamera
                  mode="ocr"
                  onOCRCapture={handleOCRCapture}
                  isOCRProcessing={isOCRProcessing}
                  ocrError={ocrError}
                  onClearOCRError={() => {
                    setOcrError(null)
                    workflowActions.setError(null)
                  }}
                  isBackendHealthy={isBackendHealthy}
                />
              )}

              {/* Product Context */}
              {scannedProduct && (
                <ProductCard
                  product={{
                    barcode: scannedProduct.barcode,
                    productName: scannedProduct.productName,
                    brand: scannedProduct.brand,
                  }}
                  mode="selected"
                />
              )}

              {/* Manual Entry Form */}
              {!inventoryData.expiryDate && (
                <InventoryForm
                  data={inventoryData}
                  onChange={setInventoryData}
                  onSubmit={handleInventoryFormSubmit}
                  title={
                    ocrError || isBackendHealthy === false
                      ? t('expiry.manualEntryFallback')
                      : t('expiry.orEnterManually')
                  }
                  submitButtonText={t('expiry.confirmDate')}
                />
              )}

              {/* Success Form */}
              {inventoryData.expiryDate && (
                <InventoryForm data={inventoryData} onChange={setInventoryData} mode="confirm" />
              )}

              {/* Add to Inventory */}
              {inventoryData.expiryDate && (
                <div className="flex justify-center">
                  <Button
                    disabled={inventoryData.quantity <= 0 || inventoryData.price <= 0}
                    onClick={handleAddToInventory}
                    variant="secondary"
                  >
                    {t('inventory.addToInventory')} • {inventoryData.quantity}x €
                    {inventoryData.price.toFixed(2)}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Success notification */}
          {scannedItems.length > 0 && uiStep === 'camera-barcode' && (
            <Alert className="font-mono flex items-center justify-center border-none">
              <AlertDescription>
                {t('inventory.addedToList', { productName: scannedItems[0].productName })}
              </AlertDescription>
            </Alert>
          )}

          {/* Scanned Items List */}
          <ScannedItemsList
            items={scannedItems}
            onItemUpdated={updatedItem => {
              setScannedItems(prev =>
                prev.map(item => (item.id === updatedItem.id ? updatedItem : item)),
              )
            }}
          />

          {/* Navigation Controls */}
          <ScanningControls
            canGoBack={canGoBack}
            onGoBack={handleGoBack}
            backButtonText={
              previousStepName
                ? t('navigation.backTo', { stepName: previousStepName })
                : t('navigation.goBack')
            }
            showPrimaryAction={scannedItems.length > 0}
            onPrimaryAction={handleFinalSubmission}
            primaryActionText={t('inventory.finishAndSubmit', { count: scannedItems.length })}
          />
        </div>
      </div>

      {/* Submission Confirmation Dialog */}
      {showSubmissionDialog && (
        <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('submission.title')}</DialogTitle>
              <DialogDescription>{t('submission.description')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                {t('submission.submitText', { count: scannedItems.length })}
              </div>

              {/* Summary List */}
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-2xl p-3 bg-gray-50">
                {scannedItems.map(item => {
                  const totalValue = item.quantity * item.price
                  return (
                    <div
                      key={item.id}
                      className="flex justify-between items-start p-2 bg-white rounded-2xl border text-sm"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.productName}</div>
                        {item.brand && <div className="text-xs text-gray-600">{item.brand}</div>}
                        <div className="text-xs text-gray-500">
                          {t('submission.totals.expires')}{' '}
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

              {/* Total Summary */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center font-medium">
                  <span>{t('submission.totals.totalItems')}</span>
                  <span>{scannedItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <div className="flex justify-between items-center font-medium">
                  <span>{t('submission.totals.totalValue')}</span>
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
                {t('submission.buttons.cancel')}
              </Button>
              <Button
                variant="secondary"
                onClick={handleConfirmSubmission}
                disabled={isSubmittingBatch}
              >
                <Check className="w-6 h-6 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
                {isSubmittingBatch
                  ? t('submission.buttons.submitting')
                  : t('submission.buttons.submitToInventory')}
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
                {t('success.title')}
              </DialogTitle>
              <DialogDescription>
                {submissionResult.successCount === submissionResult.totalCount
                  ? t('success.description.allSuccess', { count: submissionResult.successCount })
                  : t('success.description.partialSuccess', {
                      successCount: submissionResult.successCount,
                      totalCount: submissionResult.totalCount,
                    })}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 mt-4">
              <Button
                onClick={() => {
                  setShowSuccessDialog(false)
                  // Reset workflow to beginning for more scanning
                  workflowActions.resetWorkflow()
                }}
                className="w-full"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                {t('success.buttons.keepScanning')}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessDialog(false)
                  // Navigate to dashboard - you might need to add navigation logic here
                  window.location.href = '/dashboard/inventory/batches'
                }}
                className="w-full"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {t('success.buttons.viewInDashboard')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
