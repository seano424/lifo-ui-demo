'use client'

import React, { useState, useEffect } from 'react'
import {
  Camera,
  Info,
  ArrowLeft,
  CheckCircle,
  Keyboard,
  Package,
  Euro,
  Edit3,
  AlertCircle,
  ArrowRight,
  Scan,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UniversalBarcodeDetector } from '@/lib/barcode/barcode-detector'
import { Typography } from '@/components/ui/typography'

// Import working components from BarcodeDemo
import BarcodeScanner, { BarcodeDetection } from '@/components/barcode/barcode-scanner'
import ManualBarcodeEntry from '@/components/barcode/manual-barcode-entry'

// Import working store integration
import {
  useScanningStep,
  useScannedProduct,
  useScanningActions,
  useExpiryInfo,
  useScanningError,
  useScanningProcessing,
  useCanGoBack,
  usePreviousStepName,
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
  const currentStep = useScanningStep()
  const scannedProduct = useScannedProduct()
  const expiryInfo = useExpiryInfo()
  const workflowError = useScanningError()
  const isWorkflowProcessing = useScanningProcessing()
  const canGoBack = useCanGoBack()
  const previousStepName = usePreviousStepName()
  const { activeStore } = useStoreState()

  const [browserSupport, setBrowserSupport] = useState<{
    native: boolean
    polyfill: boolean
    formats: string[]
  } | null>(null)

  // Store actions
  const workflowActions = useScanningActions()

  // Local UI state for streamlined flow
  const [uiStep, setUIStep] = useState<UIStep>('camera-barcode')
  const [showManualBarcode, setShowManualBarcode] = useState(false)
  const [showManualExpiry, setShowManualExpiry] = useState(false)
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [lookupBarcode, setLookupBarcode] = useState<string | null>(null)
  const [isRescanning, setIsRescanning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [showSystemStatus, setShowSystemStatus] = useState(false)

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
    setIsClient(true)
  }, [])

  // Check browser support on component mount
  useEffect(() => {
    async function checkSupport() {
      setIsLoading(true)

      const native = typeof window !== 'undefined' && 'BarcodeDetector' in window
      let polyfill = false
      let formats: string[] = []

      try {
        if (typeof window !== 'undefined') {
          const supportedFormats = await UniversalBarcodeDetector.getSupportedFormats()
          formats = supportedFormats
          polyfill = true
        }
      } catch (error) {
        console.error('Polyfill check failed:', error)
      }

      setBrowserSupport({ native, polyfill, formats })
      setIsLoading(false)
    }

    if (isClient) {
      checkSupport()
    }
  }, [isClient])

  // Initialize store ID when active store changes
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

  // Updated workflow sync effect in WorkingStreamlinedScanningInterface

  useEffect(() => {
    switch (currentStep) {
      case 'barcode':
        setUIStep('camera-barcode')
        setShowManualBarcode(false)
        setShowManualExpiry(false)
        setLookupBarcode(null)
        setQuantity(1)
        setPrice(0)
        setManualExpiryDate('')
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
  }, [
    currentStep,
    scannedProduct,
    expiryInfo,
    manualExpiryDate,
    quantity,
    price,
    onItemAdded,
    isRescanning,
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
  const handleManualProductSelected = (barcode: string, productData: any) => {
    console.log('Manual product selected:', barcode, productData)
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
      setShowManualExpiry(false)

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
      setShowManualExpiry(false)
    }
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

  // Format price
  const formatPrice = (price: number) => `€${price.toFixed(2)}`

  // Test barcodes for easy testing (verified working)
  const testBarcodes = [
    { barcode: '3017624010701', name: 'Nutella' },
    { barcode: '737628064502', name: 'Thai Peanut Noodles' },
    { barcode: '078000113464', name: 'Orange Sunkist' },
    { barcode: '5060482840209', name: 'Deliciously Ella Oat Bar' },
  ]

  const testBarcode = (barcode: string) => {
    workflowActions.setBarcodeScanned(barcode, {
      format: 'Test Entry',
      rawValue: barcode,
      confidence: 1.0,
    })
    setLookupBarcode(barcode)
  }

  const devMode = process.env.NODE_ENV === 'development'

  if (!isClient || isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">
            {!isClient ? 'Loading client...' : 'Initializing scanning system...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white min-h-screen flex flex-col gap-4 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">LIFO Complete Scanning System</h1>
        <p className="text-gray-600">
          Camera scanning + Manual entry + Open Food Facts integration + Workflow management
        </p>
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShowSystemStatus(!showSystemStatus)}>
            <Info className="w-4 h-4 mr-2" />
            {showSystemStatus ? 'Hide System Status' : 'Show System Status'}
          </Button>
        </div>
      </div>

      {/* Browser Support Info */}
      {browserSupport && showSystemStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {browserSupport.native ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span>
                    Barcode Detection: {browserSupport.native ? 'Native API' : 'Polyfill'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Open Food Facts: Connected</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Supabase Cache: Ready</span>
                </div>
              </div>

              <div className="space-y-1">
                <strong>Supported Formats:</strong>
                <div className="flex flex-wrap gap-1">
                  {browserSupport.formats.slice(0, 6).map(format => (
                    <span
                      key={format}
                      className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                    >
                      {format.toUpperCase()}
                    </span>
                  ))}
                  {browserSupport.formats.length > 6 && (
                    <span className="px-1 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      +{browserSupport.formats.length - 6} more
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <strong>Quick Test:</strong>
                <div className="space-y-1">
                  {testBarcodes.slice(0, 3).map(item => (
                    <Button
                      key={item.barcode}
                      size="sm"
                      variant="outline"
                      onClick={() => testBarcode(item.barcode)}
                      className="text-xs h-7 w-full justify-start"
                    >
                      {item.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
        {uiStep === 'camera-barcode' && (
          <>
            <div className="space-y-2">
              <BarcodeScanner
                onScan={handleScan}
                onError={handleError}
                autoStart={true}
                className="w-full"
                title="Scan Product"
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

            <Alert>
              <Camera className="h-4 w-4" />
              <AlertDescription>
                Point your camera at any product barcode. The scanner will automatically detect
                supported formats and look up product information from Open Food Facts.
              </AlertDescription>
            </Alert>
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
                <div className="pt-2 space-y-2">
                  <Button
                    onClick={workflowActions.confirmProduct}
                    className="w-full"
                    disabled={isLookingUp}
                  >
                    {isLookingUp ? 'Looking up product...' : 'Proceed to Expiry Date Scanning'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Camera Expiry Scanning */}
        {uiStep === 'camera-expiry' && (
          <div className="space-y-4">
            {/* Product Context */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{scannedProduct?.brand}</span>
                  <span className="text-gray-500">•</span>
                  <span className="font-medium">{scannedProduct?.productName}</span>
                  <span className="text-gray-500">•</span>
                  <span className="font-mono text-xs">{scannedProduct?.barcode}</span>
                </div>
              </CardContent>
            </Card>

            {/* Camera for OCR or Manual Entry */}
            {!showManualExpiry && !manualExpiryDate && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Camera className="w-4 h-4" />
                    <span>Point camera at expiry date</span>
                  </div>
                  <BarcodeScanner
                    onScan={() => {}} // Don't auto-trigger OCR - let user click button
                    onError={handleError}
                    autoStart={true}
                    className="w-full"
                    title="Scan Expiry Date"
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
              <Card className="">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Typography variant="h3" className="text-secondary">
                      {expiryInfo?.isManual
                        ? 'Date entered manually'
                        : 'Date captured successfully'}
                    </Typography>
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
                    <Label className="text-xs">Price per unit (€)</Label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        min="0"
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

        {/* STEP 4: Batch Success */}
        {uiStep === 'batch-success' && (
          <Card className="">
            <CardContent className="p-4 text-center">
              <Typography variant="h3" className="mb-2">
                Product Added Successfully!
              </Typography>
              <Typography variant="p" className="mb-4">
                {quantity}x {scannedProduct?.productName} • Expires{' '}
                {manualExpiryDate ? new Date(manualExpiryDate).toLocaleDateString() : 'Unknown'}
              </Typography>
              <Button className="w-full" onClick={handleScanAnother}>
                <Scan className="w-4 h-4" />
                Scan Another Product
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Scans */}
        {scannedItems.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Typography variant="h3">Total items scanned</Typography>
                <Badge variant="secondary">{scannedItems.length}</Badge>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {scannedItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 border rounded text-sm"
                  >
                    <div className="flex-1">
                      <Typography variant="p">
                        <span className="text-gray-500">Product:</span> {item.productName}
                      </Typography>
                      <Typography variant="p">
                        <span className="font-normal text-gray-500">Quantity:</span> {item.quantity}
                        x <span className="font-normal text-gray-500">Price:</span>{' '}
                        {formatPrice(item.price)}{' '}
                        <span className="font-normal text-gray-500">Expiry:</span>{' '}
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </Typography>
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

        {/* Footer */}
        <div className="flex justify-center gap-4">
          {canGoBack && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleGoBack} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                {previousStepName ? `Back to ${previousStepName}` : 'Go Back'}
              </Button>
            </div>
          )}

          {/* Finish and submit button */}
          {scannedItems.length > 0 && (
            <div className="flex justify-center pt-4">
              <Button variant="brandSecondary" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Finish and submit {scannedItems.length} item{scannedItems.length > 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
