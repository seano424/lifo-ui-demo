'use client'

import React, { useState, useEffect } from 'react'
import {
  Camera,
  ScanLine,
  CheckCircle,
  Keyboard,
  Package,
  Euro,
  ArrowRight,
  Plus,
  Edit3,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Import working components from BarcodeDemo
import BarcodeScanner, { BarcodeDetection } from '@/components/barcode/barcode-scanner'
import ManualBarcodeEntry from '@/components/barcode/manual-barcode-entry'

// Import working store integration
import {
  useScanningStep,
  useScannedProduct,
  useWorkflowProgress,
  useScanHistory,
  useScanningActions,
  useExpiryInfo,
  useScanningError,
  useScanningProcessing,
} from '@/lib/stores/scanning-workflow-store'
import { useStoreState } from '@/lib/stores/store-context'
import { useProductLookup } from '@/hooks/use-product-lookup'

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

type UIStep = 'camera-barcode' | 'product-success' | 'camera-expiry' | 'batch-success'

export default function WorkingStreamlinedScanningInterface({
  onItemAdded,
  className,
}: WorkingStreamlinedScanningProps) {
  // Store state - using the working workflow store from BarcodeDemo
  const currentStep = useScanningStep()
  const scannedProduct = useScannedProduct()
  const workflowProgress = useWorkflowProgress()
  const scanHistory = useScanHistory()
  const expiryInfo = useExpiryInfo()
  const workflowError = useScanningError()
  const isWorkflowProcessing = useScanningProcessing()
  const { activeStore } = useStoreState()

  // Store actions
  const workflowActions = useScanningActions()

  // Local UI state for streamlined flow
  const [uiStep, setUIStep] = useState<UIStep>('camera-barcode')
  const [showManualBarcode, setShowManualBarcode] = useState(false)
  const [showManualExpiry, setShowManualExpiry] = useState(false)
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [lookupBarcode, setLookupBarcode] = useState<string | null>(null)
  const [cameraResetCounter, setCameraResetCounter] = useState(0)
  const [isRescanning, setIsRescanning] = useState(false)

  // Form state for batch creation
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(0)
  const [manualExpiryDate, setManualExpiryDate] = useState('')

  // Debug: Track when manualExpiryDate changes
  useEffect(() => {
    console.log('manualExpiryDate changed to:', manualExpiryDate)
  }, [manualExpiryDate])

  // Debug: Track expiryInfo changes
  useEffect(() => {
    console.log('expiryInfo changed:', expiryInfo)
  }, [expiryInfo])

  // Product lookup hook - exactly like BarcodeDemo
  const {
    data: lookupResult,
    isLoading: isLookingUp,
    error: lookupError,
  } = useProductLookup(lookupBarcode, !!lookupBarcode)

  // Initialize store ID when active store changes - like BarcodeDemo
  useEffect(() => {
    if (activeStore) {
      workflowActions.setStoreId(activeStore.store_id)
    }
  }, [activeStore, workflowActions])

  // Update workflow store when lookup completes - like BarcodeDemo
  useEffect(() => {
    if (lookupResult && lookupBarcode) {
      workflowActions.setProductLookupResult(lookupResult)
    }
  }, [lookupResult, lookupBarcode, workflowActions])

  // Sync workflow state to UI steps - this is the key integration
  useEffect(() => {
    switch (currentStep) {
      case 'barcode':
        setUIStep('camera-barcode')
        setShowManualBarcode(false)
        setShowManualExpiry(false)
        break
      case 'product':
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
        setShowManualExpiry(false)
        break
      case 'confirmation':
        // Stay on expiry step but show the confirmation form
        setUIStep('camera-expiry')
        if (expiryInfo?.extractedDate && !isRescanning) {
          console.log('Workflow sync: setting date from expiryInfo:', expiryInfo.extractedDate)
          setManualExpiryDate(expiryInfo.extractedDate)
        }
        break
      case 'complete':
        // Add to scanned items list
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
          setScannedItems(prev => [newItem, ...prev])
          onItemAdded?.(newItem)
        }
        setUIStep('batch-success')
        break
    }
  }, [currentStep, scannedProduct, expiryInfo, manualExpiryDate, quantity, price, onItemAdded])

  // Handle barcode scan - exactly like BarcodeDemo
  const handleScan = (barcode: string, detection?: BarcodeDetection) => {
    console.log('Barcode scanned:', barcode, detection)
    workflowActions.setBarcodeScanned(barcode, detection)
    setLookupBarcode(barcode)
    setShowManualBarcode(false)
  }

  // Handle scan error - like BarcodeDemo
  const handleError = (error: Error) => {
    console.error('Barcode scanner error:', error)
    workflowActions.setError(error.message)
  }

  // Handle manual product found - like BarcodeDemo
  const handleProductFound = (barcode: string, lookupResult: any) => {
    console.log('Product found:', barcode, lookupResult)
    // This will trigger the workflow state change
  }

  // Handle manual product entry - like BarcodeDemo
  const handleManualEntry = (productData: any) => {
    console.log('Manual product added:', productData)
    workflowActions.setManualProductEntry({
      productName: productData.productName || productData.name,
      brand: productData.brand,
      category: productData.category,
      imageUrl: productData.imageUrl,
    })
  }

  // Handle proceed to expiry scanning
  const handleProceedToExpiry = () => {
    workflowActions.confirmProduct()
  }

  // Handle OCR simulation (replace with real OCR later)
  const handleOCRCapture = () => {
    console.log('handleOCRCapture called - setting date to 2025-02-15')
    // Simulate OCR processing
    const mockDate = '2025-02-15'
    workflowActions.setExpiryDateResult({
      extractedDate: mockDate,
      confidence: 0.95,
      isManual: false,
      processingTime: 2000,
    })
    setManualExpiryDate(mockDate)
  }

  // Handle manual expiry date confirmation
  const handleManualExpiryConfirm = () => {
    if (manualExpiryDate) {
      workflowActions.setManualExpiryDate(manualExpiryDate)
    }
  }

  // Handle add to inventory
  const handleAddToInventory = () => {
    workflowActions.setBatchData({
      quantity,
      costPrice: price,
      sellingPrice: price * 1.3,
    })
    workflowActions.completeWorkflow()
  }

  // Handle scan another product
  const handleScanAnother = () => {
    // Reset everything for new scan
    workflowActions.resetWorkflow()
    setLookupBarcode(null)
    setQuantity(1)
    setPrice(0)
    setManualExpiryDate('')
    setShowManualBarcode(false)
    setShowManualExpiry(false)
  }

  // Handle rescan expiry date
  const handleRescanExpiry = () => {
    console.log('Rescanning expiry date...')
    // Set rescanning flag to prevent workflow sync from setting date
    setIsRescanning(true)
    // Reset expiry date state to show camera again
    setManualExpiryDate('')
    setShowManualExpiry(false)
    // Increment camera reset counter to force re-render
    setCameraResetCounter(prev => prev + 1)
    console.log('Camera reset counter:', cameraResetCounter + 1)
    // Clear rescanning flag after a short delay
    setTimeout(() => {
      setIsRescanning(false)
    }, 500)
  }

  // Format price
  const formatPrice = (price: number) => `€${price.toFixed(2)}`

  return (
    <div className={`bg-white min-h-screen ${className}`}>
      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Error Display */}
        {(workflowError || lookupError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {workflowError || lookupError?.message || 'An error occurred'}
            </AlertDescription>
          </Alert>
        )}

        {/* STEP 1: Camera Barcode Scanning */}
        {uiStep === 'camera-barcode' && !showManualBarcode && (
          <>
            <BarcodeScanner
              onScan={handleScan}
              onError={handleError}
              autoStart={true}
              className="w-full"
            />
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

            <Alert>
              <Camera className="h-4 w-4" />
              <AlertDescription>
                Point your camera at any product barcode. The scanner will automatically detect
                supported formats and look up product information from Open Food Facts.
              </AlertDescription>
            </Alert>
          </>
        )}

        {/* Manual Barcode Entry */}
        {uiStep === 'camera-barcode' && showManualBarcode && (
          <div className="space-y-4">
            <ManualBarcodeEntry
              onProductFound={handleProductFound}
              onManualEntry={handleManualEntry}
            />
            <Button
              variant="outline"
              onClick={() => setShowManualBarcode(false)}
              className="w-full"
            >
              Back to Camera
            </Button>
          </div>
        )}

        {/* STEP 2: Product Success */}
        {uiStep === 'product-success' && scannedProduct && (
          // <Card className="border-green-200 bg-green-50">
          //   <CardContent className="p-4">
          //     <div className="flex items-start gap-3">
          //       <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          //       <div className="flex-1">
          //         <h3 className="font-medium text-green-800">Product Scanned</h3>
          //         <div className="text-sm text-green-700 mt-1">
          //           <div className="font-medium">{scannedProduct.productName}</div>
          //           {scannedProduct.brand && <div>{scannedProduct.brand}</div>}
          //           <div className="font-mono text-xs text-green-600 mt-1">
          //             {scannedProduct.barcode}
          //           </div>
          //         </div>

          //         {/* Lookup status */}
          //         {isLookingUp && (
          //           <Badge variant="outline" className="animate-pulse mt-2">
          //             Looking up...
          //           </Badge>
          //         )}

          //         {lookupResult && (
          //           <div className="mt-2">
          //             {lookupResult.found ? (
          //               <Alert className="bg-green-100 border-green-300">
          //                 <CheckCircle className="h-4 w-4 text-green-600" />
          //                 <AlertDescription className="text-green-800">
          //                   Product found! Ready to proceed to expiry date scanning.
          //                 </AlertDescription>
          //               </Alert>
          //             ) : (
          //               <Alert variant="destructive">
          //                 <AlertCircle className="h-4 w-4" />
          //                 <AlertDescription>
          //                   Product not found in database. You may need to add it manually.
          //                 </AlertDescription>
          //               </Alert>
          //             )}
          //           </div>
          //         )}
          //       </div>
          //     </div>

          //     {/* Continue Button */}
          //     <div className="mt-4">
          //       <Button
          //         onClick={handleProceedToExpiry}
          //         className="w-full bg-purple-600 hover:bg-purple-700"
          //         disabled={isLookingUp}
          //       >
          //         {isLookingUp ? 'Looking up product...' : 'Proceed to Expiry Date Scanning'}
          //         <ArrowRight className="w-4 h-4 ml-2" />
          //       </Button>
          //     </div>
          //   </CardContent>
          // </Card>
          <Card className="border-green-200">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Product Scanned</h4>
                  <div className="flex items-center gap-2">
                    {isLookingUp && (
                      <Badge variant="outline" className="animate-pulse">
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
                    <strong>Barcode:</strong> <code>{scannedProduct.barcode}</code>
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
                    <AlertDescription>Lookup failed: {lookupError.message}</AlertDescription>
                  </Alert>
                )}

                {/* Lookup Result */}
                {!isLookingUp &&
                  !lookupError &&
                  scannedProduct.lookupResult &&
                  (scannedProduct.lookupResult.found ? (
                    <Alert>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        Product found! Ready to proceed to expiry date scanning.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Product not found in database. You may need to add it manually.
                      </AlertDescription>
                    </Alert>
                  ))}

                {/* Next Step Button */}
                <div className="pt-2">
                  <Button
                    onClick={workflowActions.confirmProduct}
                    className="w-full"
                    disabled={isLookingUp}
                  >
                    {isLookingUp ? 'Looking up product...' : 'Proceed to Expiry Date Scanning'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Camera Expiry Scanning */}
        {uiStep === 'camera-expiry' && (
          <div className="space-y-4">
            {/* Debug Info */}
            <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
              Debug: uiStep={uiStep}, showManualExpiry={showManualExpiry.toString()}, manualExpiryDate={manualExpiryDate || 'empty'}, cameraResetCounter={cameraResetCounter}
            </div>
            {/* Product Context */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{scannedProduct?.productName}</span>
                  <span className="text-gray-500">•</span>
                  <span className="font-mono text-xs">{scannedProduct?.barcode}</span>
                </div>
              </CardContent>
            </Card>

            {/* Camera for OCR or Manual Entry */}
            {(() => {
              console.log('Camera section condition check:', { showManualExpiry, manualExpiryDate, shouldShow: !showManualExpiry && !manualExpiryDate })
              return !showManualExpiry && !manualExpiryDate
            })() && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Camera className="w-4 h-4" />
                    <span>Point camera at expiry date</span>
                  </div>
                  <BarcodeScanner
                    key={`expiry-camera-${cameraResetCounter}`}
                    onScan={() => {}} // Don't auto-trigger OCR - let user click button
                    onError={handleError}
                    autoStart={true}
                    className="w-full"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleOCRCapture}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    disabled={isWorkflowProcessing}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {isWorkflowProcessing ? 'Processing...' : 'Capture Expiry Date'}
                  </Button>

                  <Button variant="outline" onClick={() => setShowManualExpiry(true)}>
                    <Keyboard className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Manual Expiry Entry */}
            {showManualExpiry && !manualExpiryDate && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Label className="font-medium">Manual Date Entry</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="expiry" className="text-xs">
                        Expiry Date
                      </Label>
                      <Input
                        id="expiry"
                        type="date"
                        value={manualExpiryDate}
                        onChange={e => setManualExpiryDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="quantity" className="text-xs">
                        Quantity
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={quantity}
                        onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                        min="1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="price" className="text-xs">
                      Price per Unit
                    </Label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={e => setPrice(parseFloat(e.target.value) || 0)}
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
                    <Button variant="outline" onClick={() => setShowManualExpiry(false)}>
                      Back
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Success with Date Captured */}
            {manualExpiryDate && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      {expiryInfo?.isManual
                        ? 'Date entered manually'
                        : 'Date captured successfully'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Expiry Date</Label>
                      <Input
                        type="date"
                        value={manualExpiryDate}
                        onChange={e => setManualExpiryDate(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                        min="1"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label className="text-xs">Price per Unit</Label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                        className="pl-10 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Add to Inventory Button */}
            {manualExpiryDate && quantity > 0 && price > 0 && (
              <div className="flex gap-2">
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={handleAddToInventory}
                >
                  Add to Inventory • {quantity}x {formatPrice(price)}
                </Button>
              </div>
            )}

            {/* Re-scan Button - Always available when in expiry step */}
            {manualExpiryDate && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={handleRescanExpiry}>
                  <Camera className="w-4 h-4 mr-2" />
                  Re-scan expiry date
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Batch Success */}
        {uiStep === 'batch-success' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-medium text-green-800 mb-2">Product Added Successfully!</h3>
              <p className="text-sm text-green-700 mb-4">
                {quantity}x {scannedProduct?.productName} • Expires{' '}
                {manualExpiryDate ? new Date(manualExpiryDate).toLocaleDateString() : 'Unknown'}
              </p>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={handleScanAnother}
              >
                Scan Another Product
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Scans List */}
        {scannedItems.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Recent Scans</h3>
                <Badge variant="secondary">{scannedItems.length}</Badge>
              </div>

              <div className="space-y-2 max-h-32 overflow-y-auto">
                {scannedItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 border rounded text-sm"
                  >
                    <div className="flex-1">
                      <div>{item.productName}</div>
                      <div className="text-xs text-gray-500">
                        {item.quantity}x • {formatPrice(item.price)} • Exp:{' '}
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Edit3 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
