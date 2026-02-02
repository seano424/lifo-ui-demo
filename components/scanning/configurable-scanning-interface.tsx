'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BarcodeDetection } from '@/components/barcode/barcode-scanner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useCurrency } from '@/hooks/use-currency'
import { useOCRWithFallback } from '@/hooks/use-ocr-processing'
import { useProductLookup } from '@/hooks/use-product-lookup'
import { captureImageFromVideo } from '@/lib/api/ocr-client'
import type { ProductLookupResult } from '@/lib/queries/open-food-facts'
import {
  useCanGoBack,
  useExpiryInfo,
  usePreviousStepName,
  useScannedProduct,
  useScanningActions,
  useScanningStep,
} from '@/lib/stores/scanning-workflow-store'
import { useStoreState } from '@/lib/stores/store-context'
import { AlertCircle, RefreshCw } from 'lucide-react'
import {
  InventoryForm,
  type InventoryFormData,
  ProductCard,
  type ScannedItem,
  ScannedItemsList,
  ScanningCamera,
  ScanningControls,
} from './shared'

// Base interface for scanning workflows
export interface BaseScanningConfig {
  // Workflow type
  workflowType: 'scan-in' | 'scan-out'

  // Camera configuration
  enableBarcodeScanning?: boolean
  enableOCRScanning?: boolean

  // Form configuration
  showQuantityField?: boolean
  showPriceField?: boolean
  showExpiryField?: boolean

  // Product lookup behavior
  enableProductLookup?: boolean
  enableManualEntry?: boolean

  // Submission behavior
  enableBatchSubmission?: boolean

  // Labels and text customization
  scanningTitle?: string
  confirmationTitle?: string
  submitButtonText?: string
}

export interface BaseScanningCallbacks {
  onItemProcessed?: (item: ScannedItem) => void
  onBatchSubmitted?: (items: ScannedItem[]) => Promise<void>
  onError?: (error: string) => void
  onProductFound?: (product: ProductLookupResult) => void
  onWorkflowComplete?: () => void
}

export interface BaseScanningProps {
  config: BaseScanningConfig
  callbacks?: BaseScanningCallbacks
  className?: string
}

export interface BaseScanningState {
  // UI state
  currentUIStep: 'barcode' | 'product' | 'processing' | 'form' | 'confirmation'
  showManualEntry: boolean

  // Scanning state
  lookupBarcode: string | null
  ocrError: string | null

  // Form state
  formData: InventoryFormData

  // Items state
  processedItems: ScannedItem[]

  // Dialog states
  showSubmissionDialog: boolean
  showSuccessDialog: boolean
  submissionResult: {
    successCount: number
    totalCount: number
  } | null
}

// Helper function to get user-friendly error messages
function getProductLookupErrorMessage(
  lookupResult: ProductLookupResult | undefined,
  lookupError: Error | null,
): {
  title: string
  message: string
  showRetry: boolean
  showManualEntry: boolean
} | null {
  // No error if product was found
  if (lookupResult?.found) return null

  // Handle lookup errors from the hook
  if (lookupError) {
    return {
      title: 'Lookup Error',
      message: 'Unable to search for this product. Please try again.',
      showRetry: true,
      showManualEntry: true,
    }
  }

  // Handle specific error types from the result
  if (lookupResult && !lookupResult.found) {
    switch (lookupResult.errorType) {
      case 'network':
        return {
          title: 'Network Error',
          message:
            'Unable to connect to product database. Please check your internet connection and try again.',
          showRetry: true,
          showManualEntry: true,
        }
      case 'not_found':
        return {
          title: 'Product Not Found',
          message: `No product information found for barcode ${lookupResult.barcode}. You can proceed by entering product details manually.`,
          showRetry: false,
          showManualEntry: true,
        }
      case 'invalid_barcode':
        return {
          title: 'Invalid Barcode',
          message: 'The scanned barcode appears to be invalid. Please try scanning again.',
          showRetry: true,
          showManualEntry: false,
        }
      default:
        return {
          title: 'Lookup Failed',
          message: lookupResult.error || 'An error occurred while looking up the product.',
          showRetry: true,
          showManualEntry: true,
        }
    }
  }

  return null
}

// Custom hook for base scanning logic
export function useBaseScanningLogic(
  config: BaseScanningConfig,
  callbacks?: BaseScanningCallbacks,
) {
  // Workflow state
  const currentStep = useScanningStep()
  const scannedProduct = useScannedProduct()
  const expiryInfo = useExpiryInfo()
  const canGoBack = useCanGoBack()
  const previousStepName = usePreviousStepName()
  const { activeStore } = useStoreState()
  const workflowActions = useScanningActions()

  // OCR processing
  // const { processExpiryDate, isLoading: isOCRProcessing, isBackendHealthy } = useOCRWithFallback() // debug
  const { processExpiryDate, isLoading: isOCRProcessing } = useOCRWithFallback()

  // Local state
  const [state, setState] = useState<BaseScanningState>({
    currentUIStep: 'barcode',
    showManualEntry: false,
    lookupBarcode: null,
    ocrError: null,
    formData: {
      expiryDate: '',
      quantity: 1,
      price: 0,
    },
    processedItems: [],
    showSubmissionDialog: false,
    showSuccessDialog: false,
    submissionResult: null,
  })

  // Product lookup
  const {
    data: lookupResult,
    isLoading: isLookingUp,
    error: lookupError,
  } = useProductLookup(state.lookupBarcode, !!(config.enableProductLookup && state.lookupBarcode))

  // Initialize store
  useEffect(() => {
    if (activeStore) {
      workflowActions.setStoreId(activeStore.store_id)
    }
  }, [activeStore, workflowActions])

  // Update workflow store when lookup completes
  useEffect(() => {
    if (lookupResult && state.lookupBarcode && config.enableProductLookup) {
      workflowActions.setProductLookupResult(lookupResult)
      callbacks?.onProductFound?.(lookupResult)
    }
  }, [lookupResult, state.lookupBarcode, workflowActions, callbacks, config.enableProductLookup])

  // Sync workflow state with UI
  useEffect(() => {
    switch (currentStep) {
      case 'barcode':
        setState(prev => ({
          ...prev,
          currentUIStep: 'barcode',
          showManualEntry: false,
        }))
        if (!scannedProduct) {
          setState(prev => ({ ...prev, lookupBarcode: null }))
        }
        setState(prev => ({
          ...prev,
          formData: { expiryDate: '', quantity: 1, price: 0 },
        }))
        break
      case 'product':
        if (scannedProduct?.productName) {
          setState(prev => ({ ...prev, currentUIStep: 'product' }))
          if (scannedProduct.lookupResult?.product) {
            setState(prev => ({
              ...prev,
              formData: { ...prev.formData, price: 2.99 },
            }))
          }
        }
        break
      case 'ocr':
        setState(prev => ({
          ...prev,
          currentUIStep: config.enableOCRScanning ? 'processing' : 'form',
        }))
        break
      case 'confirmation':
        setState(prev => ({ ...prev, currentUIStep: 'confirmation' }))
        if (expiryInfo?.extractedDate) {
          const formattedDate = expiryInfo.extractedDate.split('T')[0]
          setState(prev => ({
            ...prev,
            formData: { ...prev.formData, expiryDate: formattedDate },
          }))
        }
        break
      case 'complete':
        setState(prev => ({ ...prev, currentUIStep: 'barcode' }))
        callbacks?.onWorkflowComplete?.()
        break
    }
  }, [currentStep, scannedProduct, expiryInfo, config.enableOCRScanning, callbacks])

  // Event handlers
  const handleBarcodeScanned = useCallback(
    (barcode: string, detection?: BarcodeDetection) => {
      if (!config.enableBarcodeScanning) return

      workflowActions.setBarcodeScanned(barcode, detection)
      setState(prev => ({
        ...prev,
        lookupBarcode: barcode,
        showManualEntry: false,
      }))
    },
    [config.enableBarcodeScanning, workflowActions],
  )

  const handleScanError = useCallback(
    (error: Error) => {
      workflowActions.setError(error.message)
      callbacks?.onError?.(error.message)
    },
    [workflowActions, callbacks],
  )

  const handleManualProductSelected = useCallback(
    (barcode: string) => {
      if (!config.enableManualEntry) return

      setState(prev => ({
        ...prev,
        lookupBarcode: barcode,
        showManualEntry: false,
      }))
    },
    [config.enableManualEntry],
  )

  const handleGoBack = useCallback(() => {
    workflowActions.goBackStep()
    setState(prev => ({ ...prev, showManualEntry: false }))
  }, [workflowActions])

  const handleOCRCapture = useCallback(async () => {
    if (!config.enableOCRScanning || !activeStore?.store_id) {
      callbacks?.onError?.('OCR not enabled or no active store')
      return
    }

    setState(prev => ({ ...prev, ocrError: null }))
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
          setState(prev => ({
            ...prev,
            formData: { ...prev.formData, expiryDate: formattedDate },
          }))
        }
        setState(prev => ({ ...prev, ocrError: null }))
      } else {
        setState(prev => ({
          ...prev,
          ocrError: result.error?.message || 'OCR processing failed',
        }))
        workflowActions.setExpiryDateProcessing(false)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to capture image'
      setState(prev => ({ ...prev, ocrError: errorMessage }))
      workflowActions.setError(errorMessage)
      workflowActions.setExpiryDateProcessing(false)
      callbacks?.onError?.(errorMessage)
    }
  }, [config.enableOCRScanning, activeStore, workflowActions, processExpiryDate, callbacks])

  const handleFormSubmit = useCallback(() => {
    if (state.formData.expiryDate) {
      workflowActions.setManualExpiryDate(state.formData.expiryDate)
    }
  }, [state.formData.expiryDate, workflowActions])

  const handleItemProcessed = useCallback(() => {
    if (!scannedProduct || !state.formData.expiryDate) return

    // Validate that product name is filled (not empty or 'Unknown Product')
    if (!scannedProduct.productName || scannedProduct.productName.trim() === '') {
      console.error('Cannot process item: Product name is required')
      return
    }

    const newItem: ScannedItem = {
      id: Date.now().toString(),
      barcode: scannedProduct.barcode,
      productName: scannedProduct.productName,
      brand: scannedProduct.brand,
      expiryDate: state.formData.expiryDate,
      quantity: state.formData.quantity,
      price: state.formData.price,
      timestamp: new Date(),
    }

    setState(prev => ({
      ...prev,
      processedItems: [newItem, ...prev.processedItems],
      formData: { expiryDate: '', quantity: 1, price: 0 },
    }))

    callbacks?.onItemProcessed?.(newItem)

    // Reset workflow for next item
    workflowActions.resetWorkflow()
    setState(prev => ({
      ...prev,
      lookupBarcode: null,
      showManualEntry: false,
    }))

    // Set batch data and complete workflow
    workflowActions.setBatchData({
      quantity: state.formData.quantity,
      costPrice: state.formData.price,
      sellingPrice: state.formData.price * 1.3,
    })
    workflowActions.completeWorkflow()
  }, [scannedProduct, state.formData, workflowActions, callbacks])

  const handleBatchSubmission = useCallback(async () => {
    if (!config.enableBatchSubmission || state.processedItems.length === 0) return

    setState(prev => ({ ...prev, showSubmissionDialog: true }))
  }, [config.enableBatchSubmission, state.processedItems.length])

  const handleConfirmBatchSubmission = useCallback(async () => {
    if (!callbacks?.onBatchSubmitted) return

    try {
      await callbacks.onBatchSubmitted(state.processedItems)
      setState(prev => ({
        ...prev,
        submissionResult: {
          successCount: prev.processedItems.length,
          totalCount: prev.processedItems.length,
        },
        processedItems: [],
        showSubmissionDialog: false,
        showSuccessDialog: true,
      }))
    } catch (error) {
      callbacks?.onError?.(error instanceof Error ? error.message : 'Submission failed')
    }
  }, [callbacks, state.processedItems])

  return {
    // State
    state,
    setState,

    // Workflow state
    currentStep,
    scannedProduct,
    expiryInfo,
    canGoBack,
    previousStepName,
    activeStore,

    // API state
    lookupResult,
    isLookingUp,
    lookupError,
    isOCRProcessing,
    // isBackendHealthy,

    // Event handlers
    handleBarcodeScanned,
    handleScanError,
    handleManualProductSelected,
    handleGoBack,
    handleOCRCapture,
    handleFormSubmit,
    handleItemProcessed,
    handleBatchSubmission,
    handleConfirmBatchSubmission,

    // Workflow actions
    workflowActions,
  }
}

// Base scanning interface component
export default function BaseScanningInterface({ config, callbacks, className }: BaseScanningProps) {
  const logic = useBaseScanningLogic(config, callbacks)
  const currencySymbol = useCurrency()

  const formatPrice = (price: number) => `${currencySymbol}${price.toFixed(2)}`

  // Memoize error message calculation for performance
  const productLookupError = useMemo(
    () => getProductLookupErrorMessage(logic.lookupResult, logic.lookupError),
    [logic.lookupResult, logic.lookupError],
  )

  return (
    <div className={`bg-white min-h-screen flex flex-col gap-4 ${className}`}>
      <div className="w-full">
        <div className="px-4 flex flex-col gap-4">
          {/* Step 1: Barcode Scanning */}
          {logic.state.currentUIStep === 'barcode' && (
            <>
              {/* Camera Interface */}
              {config.enableBarcodeScanning && (
                <ScanningCamera
                  mode="barcode"
                  title={
                    config.scanningTitle ||
                    (logic.scannedProduct ? 'Scan Different Product' : 'Scan Product')
                  }
                  onBarcodeScanned={logic.handleBarcodeScanned}
                  onScanError={logic.handleScanError}
                  showManualEntry={logic.state.showManualEntry}
                  onToggleManualEntry={() =>
                    logic.setState(prev => ({
                      ...prev,
                      showManualEntry: !prev.showManualEntry,
                    }))
                  }
                  onManualProductSelected={logic.handleManualProductSelected}
                  onCloseManualEntry={() =>
                    logic.setState(prev => ({
                      ...prev,
                      showManualEntry: false,
                    }))
                  }
                  autoStart
                />
              )}

              {/* Selected Product Display */}
              {logic.scannedProduct && (
                <>
                  <ProductCard
                    product={{
                      barcode: logic.scannedProduct.barcode,
                      productName: logic.scannedProduct.productName,
                      brand: logic.scannedProduct.brand,
                    }}
                    mode="selected"
                    showRemoveButton
                    showProceedButton={
                      config.workflowType === 'scan-in' && logic.lookupResult?.found !== false
                    }
                    onRemove={() => {
                      logic.workflowActions.resetWorkflow()
                      logic.setState(prev => ({ ...prev, lookupBarcode: null }))
                    }}
                    onProceed={() => logic.workflowActions.setCurrentStep('ocr')}
                  />

                  {/* Product Lookup Error Display */}
                  {productLookupError && (
                    <Alert variant="destructive" className="border-orange-200 bg-orange-50">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertTitle className="text-orange-900 ">
                        {productLookupError.title}
                      </AlertTitle>
                      <AlertDescription className="text-orange-800">
                        {productLookupError.message}
                      </AlertDescription>
                      <div className="mt-3 flex gap-2">
                        {productLookupError.showRetry && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-orange-300 text-orange-900 hover:bg-orange-100"
                            onClick={() => {
                              logic.workflowActions.resetWorkflow()
                              logic.setState(prev => ({ ...prev, lookupBarcode: null }))
                            }}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Try Again
                          </Button>
                        )}
                        {productLookupError.showManualEntry && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-orange-300 text-orange-900 hover:bg-orange-100"
                            onClick={() => {
                              logic.setState(prev => ({
                                ...prev,
                                showManualEntry: true,
                              }))
                            }}
                          >
                            Enter Manually
                          </Button>
                        )}
                      </div>
                    </Alert>
                  )}
                </>
              )}
            </>
          )}

          {/* Step 2: Product Display */}
          {logic.state.currentUIStep === 'product' && logic.scannedProduct && (
            <div className="flex flex-col gap-4">
              {/* Auto-advancing to next step */}
              {!logic.isLookingUp && !logic.lookupError && logic.scannedProduct.lookupResult && (
                <Alert>
                  <AlertDescription>Proceeding to next step...</AlertDescription>
                </Alert>
              )}

              <ProductCard
                product={{
                  barcode: logic.scannedProduct.barcode,
                  productName: logic.scannedProduct.productName,
                  brand: logic.scannedProduct.brand,
                }}
              />
            </div>
          )}

          {/* Step 3: Processing/Form */}
          {(logic.state.currentUIStep === 'processing' || logic.state.currentUIStep === 'form') && (
            <div className="flex flex-col gap-4">
              {/* Product Context */}
              {logic.scannedProduct && (
                <ProductCard
                  product={{
                    barcode: logic.scannedProduct.barcode,
                    productName: logic.scannedProduct.productName,
                    brand: logic.scannedProduct.brand,
                  }}
                  mode="selected"
                />
              )}

              {/* OCR Camera */}
              {config.enableOCRScanning && !logic.state.formData.expiryDate && (
                <ScanningCamera
                  mode="ocr"
                  onOCRCapture={logic.handleOCRCapture}
                  isOCRProcessing={logic.isOCRProcessing}
                  ocrError={logic.state.ocrError}
                  onClearOCRError={() => {
                    logic.setState(prev => ({ ...prev, ocrError: null }))
                    logic.workflowActions.setError(null)
                  }}
                  // isBackendHealthy={logic.isBackendHealthy}
                />
              )}

              {/* Form */}
              <InventoryForm
                data={logic.state.formData}
                onChange={dataOrUpdater => {
                  if (typeof dataOrUpdater === 'function') {
                    logic.setState(prev => ({
                      ...prev,
                      formData: dataOrUpdater(prev.formData),
                    }))
                  } else {
                    logic.setState(prev => ({ ...prev, formData: dataOrUpdater }))
                  }
                }}
                onSubmit={logic.handleFormSubmit}
                showExpiryDate={config.showExpiryField}
                showQuantity={config.showQuantityField}
                showPrice={config.showPriceField}
                mode={logic.state.formData.expiryDate ? 'confirm' : 'edit'}
                title={config.confirmationTitle}
                submitButtonText={config.submitButtonText}
              />

              {/* Process Item Button */}
              {logic.state.formData.expiryDate && (
                <ScanningControls
                  showPrimaryAction
                  onPrimaryAction={logic.handleItemProcessed}
                  primaryActionText={`${config.workflowType === 'scan-in' ? 'Add to' : 'Remove from'} Inventory • ${logic.state.formData.quantity}x ${formatPrice(logic.state.formData.price)}`}
                  primaryActionDisabled={
                    logic.state.formData.quantity <= 0 ||
                    (config.showPriceField && logic.state.formData.price <= 0)
                  }
                />
              )}
            </div>
          )}

          {/* Processed Items List */}
          <ScannedItemsList
            items={logic.state.processedItems}
            title={`Total items ${config.workflowType === 'scan-in' ? 'scanned' : 'processed'}`}
            onEditItem={_item => {
              // TODO: Implement edit functionality
            }}
          />

          {/* Navigation Controls */}
          <ScanningControls
            canGoBack={logic.canGoBack}
            onGoBack={logic.handleGoBack}
            backButtonText={
              logic.previousStepName ? `Back to ${logic.previousStepName}` : 'Go Back'
            }
            showPrimaryAction={
              config.enableBatchSubmission && logic.state.processedItems.length > 0
            }
            onPrimaryAction={logic.handleBatchSubmission}
            primaryActionText={`Finish and submit ${logic.state.processedItems.length} item${logic.state.processedItems.length > 1 ? 's' : ''}`}
          />
        </div>
      </div>
    </div>
  )
}
