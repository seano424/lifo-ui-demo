'use client'

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Camera,
  Edit3,
  Euro,
  Keyboard,
  Package,
  RefreshCcw,
  Check,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
// Import working components from BarcodeDemo
import BarcodeScanner, {
  type BarcodeDetection,
} from '@/components/barcode/barcode-scanner'
import ManualBarcodeEntry from '@/components/barcode/manual-barcode-entry'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
// Import inventory submission hook
import {
  useInventoryActions,
  useScannedItemConverter,
} from '@/hooks/use-inventory-submission'
// Import OCR hooks and utilities
import { useOCRWithFallback } from '@/hooks/use-ocr-processing'
import { useProductLookup } from '@/hooks/use-product-lookup'
import { captureImageFromVideo } from '@/lib/api/ocr-client'
// Import working store integration
import {
  useCanGoBack,
  useExpiryInfo,
  usePreviousStepName,
  useScannedProduct,
  useScanningActions,
  // useScanningError,
  useScanningProcessing,
  useScanningStep,
} from '@/lib/stores/scanning-workflow-store'
import { useStoreState } from '@/lib/stores/store-context'

// Types for our streamlined workflow
interface ScannedItem {
  id: string
  barcode: string
  productName: string
  brand?: string
  expiryDate: string
  quantity: number
  price: number
  timestamp: Date
}

interface WorkingStreamlinedScanningProps {
  onItemAdded?: (item: ScannedItem) => void
  className?: string
}

type UIStep =
  | 'camera-barcode'
  | 'product-success'
  | 'camera-expiry'
  | 'batch-success'

export default function WorkingStreamlinedScanningInterface({
  onItemAdded,
  className,
}: WorkingStreamlinedScanningProps) {
  const currentStep = useScanningStep()
  const scannedProduct = useScannedProduct()
  const expiryInfo = useExpiryInfo()
  const isWorkflowProcessing = useScanningProcessing()
  const canGoBack = useCanGoBack()
  const previousStepName = usePreviousStepName()
  const { activeStore } = useStoreState()

  // Store actions
  const workflowActions = useScanningActions()

  // OCR processing hook
  const {
    processExpiryDate,
    isLoading: isOCRProcessing,
    isBackendHealthy,
  } = useOCRWithFallback()

  // Inventory submission hooks
  const { submitBatch, isSubmittingBatch } = useInventoryActions()
  const { convertMultipleScannedItems } = useScannedItemConverter()

  // Local UI state for streamlined flow
  const [uiStep, setUIStep] = useState<UIStep>('camera-barcode')
  const [showManualBarcode, setShowManualBarcode] = useState(false)
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [lookupBarcode, setLookupBarcode] = useState<string | null>(null)
  const [isRescanning, setIsRescanning] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)

  const [isEditingItem, setIsEditingItem] = useState(false)
  const [editingItem, setEditingItem] = useState<ScannedItem | null>(null)
  const [editForm, setEditForm] = useState({
    expiryDate: '',
    quantity: 1,
    price: 0,
    productName: '',
    brand: '',
    barcode: '',
  })
  const [showAdvancedEdit, setShowAdvancedEdit] = useState(false)
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<{
    successCount: number
    totalCount: number
  } | null>(null)

  // Form state for batch creation
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(0)
  const [manualExpiryDate, setManualExpiryDate] = useState('')

  // Product lookup hook - exactly like BarcodeDemo
  const {
    data: lookupResult,
    isLoading: isLookingUp,
    error: lookupError,
  } = useProductLookup(lookupBarcode, !!lookupBarcode)

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

  // Convert ISO datetime to date input format (YYYY-MM-DD)
  const formatDateForInput = useCallback((isoDate: string): string => {
    if (!isoDate) return ''
    // Extract just the date part from ISO string (2026-04-22T00:00:00 -> 2026-04-22)
    return isoDate.split('T')[0]
  }, [])

  // Updated workflow sync effect in WorkingStreamlinedScanningInterface
  useEffect(() => {
    switch (currentStep) {
      case 'barcode':
        setUIStep('camera-barcode')
        setShowManualBarcode(false)
        // Only clear lookupBarcode if there's no scannedProduct (preserving it when going back)
        if (!scannedProduct) {
          setLookupBarcode(null)
        }
        setQuantity(1)
        setPrice(0)
        setManualExpiryDate('')
        break
      case 'product':
        // Show product success briefly, but this step will auto-advance to OCR
        if (scannedProduct?.productName) {
          setUIStep('product-success')
          // Set default price if available
          if (scannedProduct.lookupResult?.product) {
            setPrice(2.99) // Default price - could be enhanced with store-specific pricing
          }
        }
        break
      case 'ocr':
        setUIStep('camera-expiry')

        // 🔥 FIX: Reset expiry date and rescanning flag when entering OCR step
        // This ensures the camera view shows when going back
        if (!expiryInfo?.extractedDate || isRescanning) {
          setManualExpiryDate('')
        }

        // Reset rescanning flag
        setIsRescanning(false)
        break
      case 'confirmation':
        // Stay on expiry step but show the confirmation form
        setUIStep('camera-expiry')
        if (expiryInfo?.extractedDate && !isRescanning) {
          console.log(
            'Workflow sync: setting date from expiryInfo:',
            expiryInfo.extractedDate
          )
          const formattedDate = formatDateForInput(expiryInfo.extractedDate)
          setManualExpiryDate(formattedDate)
        }
        break
      case 'complete':
        // The item creation logic has been moved to handleAddToInventory
        // Just reset to barcode scanning step
        setUIStep('camera-barcode')
        break
    }
  }, [
    currentStep,
    scannedProduct,
    expiryInfo,
    isRescanning,
    formatDateForInput,
  ])

  // Handle barcode scan
  const handleScan = (barcode: string, detection?: BarcodeDetection) => {
    console.log('Barcode scanned:', barcode, detection)
    workflowActions.setBarcodeScanned(barcode, detection)
    setLookupBarcode(barcode)
    setShowManualBarcode(false)
  }

  // Handle scan error
  const handleError = (error: Error) => {
    console.error('Barcode scanner error:', error)
    workflowActions.setError(error.message)
  }

  // Handle manual product selection from ManualBarcodeEntry
  const handleManualProductSelected = (barcode: string) => {
    // The ManualBarcodeEntry component already handles setting the workflow state
    // Just close the manual entry and set lookup barcode
    setLookupBarcode(barcode)
    setShowManualBarcode(false)
  }

  // Enhanced handleGoBack function in WorkingStreamlinedScanningInterface

  // 🔥 ENHANCED: Handle go back button with special logic for OCR step
  const handleGoBack = () => {
    // Special handling for confirmation step going back to OCR
    if (currentStep === 'confirmation') {
      console.log('Going back to OCR step - resetting expiry state...')

      // Set rescanning flag to prevent workflow sync from setting date
      setIsRescanning(true)

      // Reset expiry date state to show camera again
      setManualExpiryDate('')

      // Call workflow go back
      workflowActions.goBackStep()

      // Clear rescanning flag after a short delay (like handleRescanExpiry)
      setTimeout(() => {
        setIsRescanning(false)
      }, 500)
    } else {
      // For all other steps, use normal go back
      workflowActions.goBackStep()

      // Close any open modals/forms when going back
      setShowManualBarcode(false)
    }
  }

  // Handle real OCR capture from camera
  const handleOCRCapture = async () => {
    if (!activeStore?.store_id) {
      workflowActions.setError('No active store selected')
      return
    }

    // Clear any previous errors
    setOcrError(null)
    workflowActions.setExpiryDateProcessing(true)

    try {
      // Find the video element from the BarcodeScanner component
      const videoElement = document.querySelector('video') as HTMLVideoElement

      if (
        !videoElement ||
        videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA
      ) {
        throw new Error(
          'Camera not ready. Please ensure camera is active and showing video.'
        )
      }

      console.log('Capturing image from video for OCR processing...')

      // Capture image from video element
      const imageBlob = await captureImageFromVideo(videoElement)

      console.log(
        `Captured image: ${imageBlob.size} bytes, type: ${imageBlob.type}`
      )

      // Process with OCR API
      const result = await processExpiryDate(imageBlob, activeStore.store_id, {
        confidenceThreshold: 0.65,
        maxProcessingTimeMs: 5000,
      })

      if (result.success && result.expiryDateInfo) {
        console.log('OCR processing successful:', result.expiryDateInfo)

        // Update workflow store with OCR result
        workflowActions.setExpiryDateResult(result.expiryDateInfo)

        // Update local state for UI with properly formatted date
        if (result.expiryDateInfo.extractedDate) {
          const formattedDate = formatDateForInput(
            result.expiryDateInfo.extractedDate
          )
          setManualExpiryDate(formattedDate)
        }

        setOcrError(null)
      } else if (result.fallbackToManual) {
        console.log('OCR failed, falling back to manual entry:', result.error)

        setOcrError(result.error?.message || 'OCR processing failed')
        workflowActions.setExpiryDateProcessing(false)

        // Keep camera active for manual entry
        // Don't automatically show manual date picker - let user decide
      } else {
        // Processing failed but might be retryable
        setOcrError(result.error?.message || 'OCR processing failed')
        workflowActions.setExpiryDateProcessing(false)
      }
    } catch (error) {
      console.error('OCR capture failed:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to capture image'
      setOcrError(errorMessage)
      workflowActions.setError(errorMessage)
      workflowActions.setExpiryDateProcessing(false)
    }
  }

  // Handle manual expiry date confirmation
  const handleManualExpiryConfirm = () => {
    if (manualExpiryDate) {
      workflowActions.setManualExpiryDate(manualExpiryDate)
    }
  }

  // Handle add to inventory
  const handleAddToInventory = () => {
    // Add to scanned items list first
    if (scannedProduct && manualExpiryDate) {
      const newItem: ScannedItem = {
        id: Date.now().toString(),
        barcode: scannedProduct.barcode,
        productName: scannedProduct.productName || 'Unknown Product',
        brand: scannedProduct.brand,
        expiryDate: manualExpiryDate,
        quantity,
        price,
        timestamp: new Date(),
      }
      setScannedItems((prev) => [newItem, ...prev])
      onItemAdded?.(newItem)

      // Reset workflow for next item
      workflowActions.resetWorkflow()
      setLookupBarcode(null)
      setQuantity(1)
      setPrice(0)
      setManualExpiryDate('')
      setShowManualBarcode(false)
    }

    // Set batch data and complete workflow
    workflowActions.setBatchData({
      quantity,
      costPrice: price,
      sellingPrice: price * 1.3,
    })
    workflowActions.completeWorkflow()
  }

  // Handle final submission of all scanned items
  const handleFinalSubmission = () => {
    setShowSubmissionDialog(true)
  }

  const handleConfirmSubmission = () => {
    console.log('Submitting', scannedItems.length, 'items:', scannedItems)

    // Convert scanned items to the format expected by the inventory submission
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

    // Submit the batch to inventory using the React Query hook
    submitBatch(
      productsToSubmit.map((product) => ({
        ...product,
        storeId: activeStore?.store_id || '',
        ocrExtractedDate: new Date().toISOString(),
        ocrConfidence: 1,
      })),
      {
        onSuccess: (result) => {
          console.log('Batch submission completed:', result)

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
        onError: (error) => {
          console.error('Batch submission failed:', error)
          // Dialog stays open so user can retry or cancel
        },
      }
    )
  }

  // Format price
  const formatPrice = (price: number) => `€${price.toFixed(2)}`

  const handleEditItem = (item: ScannedItem) => {
    console.log('Editing item:', item)
    setEditingItem(item)
    setEditForm({
      expiryDate: item.expiryDate,
      quantity: item.quantity,
      price: item.price,
      productName: item.productName,
      brand: item.brand || '',
      barcode: item.barcode,
    })
    setShowAdvancedEdit(false) // Reset to basic view
    setIsEditingItem(true)
  }

  const handleSaveEdit = () => {
    if (!editingItem) return

    const updatedItem: ScannedItem = {
      ...editingItem,
      expiryDate: editForm.expiryDate,
      quantity: editForm.quantity,
      price: editForm.price,
      productName: editForm.productName,
      brand: editForm.brand || undefined,
      barcode: editForm.barcode,
    }

    setScannedItems((prev) =>
      prev.map((item) => (item.id === editingItem.id ? updatedItem : item))
    )

    setIsEditingItem(false)
    setEditingItem(null)
    setShowAdvancedEdit(false)
  }

  const handleCancelEdit = () => {
    setIsEditingItem(false)
    setEditingItem(null)
    setShowAdvancedEdit(false)
    setEditForm({
      expiryDate: '',
      quantity: 1,
      price: 0,
      productName: '',
      brand: '',
      barcode: '',
    })
  }

  return (
    <div className={`bg-white min-h-screen flex flex-col gap-4 ${className}`}>
      {/* Consistent width container for all scanning steps */}
      <div className="w-full">
        <div className="px-4 space-y-4">
          {/* STEP 1: Camera Barcode Scanning */}
          {uiStep === 'camera-barcode' && (
            <>
              {/* Show selected product if we have one (when going back from expiry) */}
              {scannedProduct && (
                <Card className="border-primary-50 shadow-primary-100">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-center gap-2">
                      <Button
                        variant="subtleDestructive"
                        className="rounded-full p-2 h-8 w-8"
                        onClick={() => {
                          workflowActions.resetWorkflow()
                          setLookupBarcode(null)
                        }}
                      >
                        X
                      </Button>
                      <div className="flex flex-col gap-2 justify-center items-center">
                        <Typography
                          className="text-secondary-900 font-black"
                          variant="p"
                        >
                          Selected Product
                        </Typography>
                        <div className="flex flex-wrap text-center justify-center items-center gap-2 text-sm">
                          <Package className="w-4 h-4 text-gray-500" />

                          <Typography variant="p">
                            {scannedProduct?.brand}
                          </Typography>
                          <Typography variant="p">•</Typography>
                          <Typography variant="p">
                            {scannedProduct?.productName}
                          </Typography>
                          <Typography variant="p">•</Typography>
                          <Typography variant="p">
                            {scannedProduct?.barcode}
                          </Typography>
                        </div>
                      </div>
                      <Button
                        variant="subtleSecondary"
                        className="font-semibold rounded-full p-2 h-8 w-8"
                        onClick={() => workflowActions.setCurrentStep('ocr')}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <BarcodeScanner
                  onScan={handleScan}
                  onError={handleError}
                  autoStart={true}
                  className="w-full max-w-xl mx-auto"
                  title={
                    scannedProduct ? 'Scan Different Product' : 'Scan Product'
                  }
                />
              </div>

              {/* Manual Barcode Entry */}
              {showManualBarcode && (
                <div className="space-y-4">
                  <ManualBarcodeEntry
                    onProductSelected={handleManualProductSelected}
                    onClose={() => setShowManualBarcode(false)}
                  />
                </div>
              )}

              {!showManualBarcode && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowManualBarcode(true)}
                    className="flex-1"
                  >
                    <Keyboard className="w-4 h-4 mr-2" />
                    Manual Entry
                  </Button>
                </div>
              )}

              {currentStep === 'barcode' && (
                <Alert>
                  <Camera className="h-4 w-4" />
                  <AlertDescription>
                    Point your camera at any product barcode. The scanner will
                    automatically detect supported formats and look up product
                    information from Open Food Facts.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* STEP 2: Product Success */}
          {uiStep === 'product-success' && scannedProduct && (
            <Card className="border-green-200">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Product Scanned</h4>
                    <div className="flex items-center gap-2">
                      {isLookingUp && (
                        <Badge
                          variant="outline"
                          className="animate-pulse"
                        >
                          Looking up...
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        {scannedProduct.detection?.format || 'Manual Entry'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>
                      <strong>Barcode:</strong>{' '}
                      <code>{scannedProduct.barcode}</code>
                    </div>
                    {scannedProduct.productName && (
                      <div>
                        <strong>Name:</strong> {scannedProduct.productName}
                      </div>
                    )}
                    {scannedProduct.brand && (
                      <div>
                        <strong>Brand:</strong> {scannedProduct.brand}
                      </div>
                    )}
                    {scannedProduct.lookupResult && (
                      <div>
                        <strong>Source:</strong>{' '}
                        {scannedProduct.lookupResult.source === 'cache'
                          ? 'Local Cache'
                          : 'Open Food Facts'}
                      </div>
                    )}
                  </div>

                  {/* Lookup Error */}
                  {lookupError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Lookup failed: {lookupError.message}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Lookup Result */}
                  {!isLookingUp &&
                    !lookupError &&
                    scannedProduct.lookupResult &&
                    (scannedProduct.lookupResult.found ? (
                      <Alert>
                        <Check className="w-6 h-6  text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
                        <AlertDescription>
                          Product found! Ready to proceed to expiry date
                          scanning.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Product not found in database. You may need to add it
                          manually.
                        </AlertDescription>
                      </Alert>
                    ))}

                  {/* Auto-advancing message */}
                  {!isLookingUp &&
                    !lookupError &&
                    scannedProduct.lookupResult && (
                      <div className="pt-2">
                        <Alert>
                          <ArrowRight className="h-4 w-4 text-blue-600" />
                          <AlertDescription>
                            Automatically proceeding to expiry date scanning...
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Camera Expiry Scanning */}
          {uiStep === 'camera-expiry' && (
            <div className="space-y-4">
              {/* Product Context */}
              <Card className="border-primary-50 shadow-primary-100">
                <CardContent className="p-3">
                  <div className="flex flex-col gap-2 justify-center items-center">
                    <Typography
                      className="text-secondary-900 font-black"
                      variant="p"
                    >
                      Selected Product
                    </Typography>
                    <div className="flex flex-wrap text-center justify-center items-center gap-2 text-sm">
                      <Package className="w-4 h-4 text-gray-500" />

                      <Typography variant="p">
                        {scannedProduct?.brand}
                      </Typography>
                      <Typography variant="p">•</Typography>
                      <Typography variant="p">
                        {scannedProduct?.productName}
                      </Typography>
                      <Typography variant="p">•</Typography>
                      <Typography variant="p">
                        {scannedProduct?.barcode}
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Camera OCR Section - Always visible */}
              {!manualExpiryDate && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <BarcodeScanner
                      onScan={() => {}} // Don't auto-trigger OCR - let user click button
                      onError={handleError}
                      autoStart={true}
                      className="w-full max-w-xl mx-auto"
                      title="Scan Expiry Date"
                      subtitle="Point camera at expiry date"
                      isBarcodeScanner={false}
                    />
                  </div>

                  {/* OCR Status and Error Display */}
                  {ocrError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        OCR Error: {ocrError}
                        {isBackendHealthy === false && (
                          <span className="block mt-1 text-xs">
                            FastAPI backend is not available. Please use manual
                            entry.
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Backend Health Warning */}
                  {isBackendHealthy === false && !ocrError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        OCR service is currently unavailable. Please use manual
                        date entry.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleOCRCapture}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                      disabled={
                        isWorkflowProcessing ||
                        isOCRProcessing ||
                        isBackendHealthy === false
                      }
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {isOCRProcessing
                        ? 'Processing OCR...'
                        : isWorkflowProcessing
                          ? 'Processing...'
                          : 'Capture Expiry Date'}
                    </Button>
                    {ocrError && (
                      <Button
                        onClick={() => {
                          setOcrError(null)
                          workflowActions.setError(null)
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Clear Error
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Manual Entry Section - Always visible alongside camera */}
              {!manualExpiryDate && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Label className="font-medium">
                      {ocrError || isBackendHealthy === false
                        ? '📝 Manual Entry (OCR unavailable)'
                        : 'Or enter manually'}
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label
                          htmlFor="expiry"
                          className="text-xs"
                        >
                          Expiry Date
                        </Label>
                        <Input
                          id="expiry"
                          type="date"
                          value={manualExpiryDate}
                          onChange={(e) => setManualExpiryDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="quantity"
                          className="text-xs"
                        >
                          Quantity
                        </Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={quantity}
                          onChange={(e) =>
                            setQuantity(parseInt(e.target.value, 10) || 1)
                          }
                          min="0"
                        />
                      </div>
                    </div>
                    <div>
                      <Label
                        htmlFor="price"
                        className="text-xs"
                      >
                        Price per unit (€)
                      </Label>
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={price}
                          onChange={(e) =>
                            setPrice(parseFloat(e.target.value) || 0)
                          }
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleManualExpiryConfirm}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                        disabled={!manualExpiryDate}
                      >
                        Confirm Date
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Success with Date Captured - Editable */}
              {manualExpiryDate && (
                <Card className="">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center mb-3">
                      <div className="flex items-center gap-2">
                        <Check className="w-6 h-6  text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
                        <Typography
                          variant="h3"
                          className="text-primary-800 font-black"
                        >
                          Date captured successfully
                        </Typography>
                      </div>
                      <Typography
                        variant="h3"
                        className="text-primary-700 font-black"
                      >
                        Finish and submit to inventory
                      </Typography>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">
                          Expiry Date (editable)
                        </Label>
                        <Input
                          type="date"
                          value={manualExpiryDate}
                          onChange={(e) => setManualExpiryDate(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          value={quantity}
                          onChange={(e) =>
                            setQuantity(parseInt(e.target.value, 10) || 1)
                          }
                          min="0"
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <Label className="text-xs">Price per unit (€)</Label>
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          min="0"
                          type="number"
                          step="0.01"
                          value={price}
                          onChange={(e) =>
                            setPrice(parseFloat(e.target.value) || 0)
                          }
                          className="pl-10 text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setManualExpiryDate('')
                          workflowActions.setError(null)
                        }}
                        className="flex-1"
                      >
                        Clear & Rescan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add to Inventory Button */}
              {manualExpiryDate && (
                <div className="flex gap-2">
                  <Button
                    disabled={quantity <= 0 || price <= 0}
                    onClick={handleAddToInventory}
                    className="w-full"
                    variant="secondary"
                  >
                    Add to Inventory • {quantity}x {formatPrice(price)}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Success notification shown inline while staying on barcode scanning */}
          {scannedItems.length > 0 && uiStep === 'camera-barcode' && (
            <Alert className="font-mono flex items-center justify-center border-none">
              <AlertDescription>
                Added {scannedItems[0].productName} to your list! Scan the next
                product.
              </AlertDescription>
            </Alert>
          )}

          {/* Recent Scans */}
          {scannedItems.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Typography variant="h3">Total items scanned</Typography>
                <div className="text-sm font-medium text-gray-500 bg-gray-100 p-2 w-10 h-10 flex items-center justify-center rounded-full">
                  {scannedItems.length > 99 ? '99+' : scannedItems.length}
                </div>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {scannedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 border rounded text-sm"
                  >
                    <div className="flex-1">
                      <Typography variant="p">
                        <span className="text-gray-500">Product:</span>{' '}
                        {item.productName}
                      </Typography>
                      <Typography variant="p">
                        <span className="font-normal text-gray-500">
                          Quantity:
                        </span>{' '}
                        {item.quantity}x{' '}
                        <span className="font-normal text-gray-500">
                          Price:
                        </span>{' '}
                        {formatPrice(item.price)}{' '}
                        <span className="font-normal text-gray-500">
                          Expiry:
                        </span>{' '}
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </Typography>
                    </div>

                    <Button
                      onClick={() => handleEditItem(item)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col sm:flex-row justify-center sm:gap-4">
            {canGoBack && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleGoBack}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {previousStepName ? `Back to ${previousStepName}` : 'Go Back'}
                </Button>
              </div>
            )}

            {/* Finish and submit button */}
            {scannedItems.length > 0 && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="secondary"
                  className="flex items-center gap-2"
                  onClick={handleFinalSubmission}
                >
                  <Check className="w-6 h-6  text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
                  Finish and submit {scannedItems.length} item
                  {scannedItems.length > 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditingItem && editingItem && (
        <Dialog
          open={isEditingItem}
          onOpenChange={setIsEditingItem}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>
                {showAdvancedEdit
                  ? 'Edit all product details including name, brand, barcode, and inventory information.'
                  : 'Quick edit expiry date, quantity, and price. Click "Edit Details" for more options.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Product Info - Now editable in advanced mode */}
              {!showAdvancedEdit ? (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium">
                    {editingItem.productName}
                  </div>
                  {editingItem.brand && (
                    <div className="text-xs text-gray-600">
                      {editingItem.brand}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 font-mono">
                    {editingItem.barcode}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 mb-2">
                    Product Details
                  </div>

                  <div>
                    <Label
                      htmlFor="edit-product-name"
                      className="text-sm font-medium"
                    >
                      Product Name
                    </Label>
                    <Input
                      id="edit-product-name"
                      type="text"
                      value={editForm.productName}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          productName: e.target.value,
                        }))
                      }
                      className="mt-1"
                      placeholder="Enter product name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label
                        htmlFor="edit-brand"
                        className="text-sm font-medium"
                      >
                        Brand
                      </Label>
                      <Input
                        id="edit-brand"
                        type="text"
                        value={editForm.brand}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            brand: e.target.value,
                          }))
                        }
                        className="mt-1"
                        placeholder="Brand name"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="edit-barcode"
                        className="text-sm font-medium"
                      >
                        Barcode
                      </Label>
                      <Input
                        id="edit-barcode"
                        type="text"
                        value={editForm.barcode}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            barcode: e.target.value,
                          }))
                        }
                        className="mt-1 font-mono text-sm"
                        placeholder="Barcode number"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Edit Form - Always visible */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    {showAdvancedEdit ? 'Inventory Details' : 'Quick Edit'}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvancedEdit(!showAdvancedEdit)}
                    className="text-xs h-7 px-2"
                  >
                    {showAdvancedEdit ? (
                      <>
                        <ArrowUp className="w-3 h-3 mr-1" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3 h-3 mr-1" />
                        Edit Details
                      </>
                    )}
                  </Button>
                </div>

                <div>
                  <Label
                    htmlFor="edit-expiry"
                    className="text-sm font-medium"
                  >
                    Expiry Date
                  </Label>
                  <Input
                    id="edit-expiry"
                    type="date"
                    value={editForm.expiryDate}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        expiryDate: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label
                      htmlFor="edit-quantity"
                      className="text-sm font-medium"
                    >
                      Quantity
                    </Label>
                    <Input
                      id="edit-quantity"
                      type="number"
                      min="0"
                      value={editForm.quantity}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          quantity: parseInt(e.target.value, 10) || 1,
                        }))
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="edit-price"
                      className="text-sm font-medium"
                    >
                      Price (€)
                    </Label>
                    <div className="relative mt-1">
                      <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="edit-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.price}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            price: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleSaveEdit}
                disabled={
                  !editForm.expiryDate ||
                  editForm.quantity <= 0 ||
                  editForm.price <= 0 ||
                  !editForm.productName.trim() ||
                  !editForm.barcode.trim()
                }
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Submission Confirmation Dialog */}
      {showSubmissionDialog && (
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
                You are about to submit {scannedItems.length} item
                {scannedItems.length > 1 ? 's' : ''} to inventory:
              </div>

              {/* Summary List */}
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

              {/* Total Summary */}
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
                <Check className="w-6 h-6  text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
                {isSubmittingBatch ? 'Submitting...' : 'Submit to Inventory'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Success Dialog */}
      {showSuccessDialog && submissionResult && (
        <Dialog
          open={showSuccessDialog}
          onOpenChange={setShowSuccessDialog}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="w-6 h-6  text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
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
                  // Reset workflow to beginning for more scanning
                  workflowActions.resetWorkflow()
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
                  // Navigate to dashboard - you might need to add navigation logic here
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
    </div>
  )
}
