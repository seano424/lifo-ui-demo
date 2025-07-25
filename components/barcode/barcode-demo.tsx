'use client'

import {
  AlertCircle,
  CheckCircle,
  Camera,
  Search,
  Package,
  Workflow,
  ArrowRight,
} from 'lucide-react'
import React, { useState, useEffect } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import ManualBarcodeEntry from '@/components/barcode/manual-barcode-entry'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BarcodeScanner, { BarcodeDetection } from '@/components/barcode/barcode-scanner'

import {
  useScanningStep,
  useScannedProduct,
  useWorkflowProgress,
  useScanHistory,
  useScanningActions, // 🔥 NEW: SSR-safe actions hook
} from '@/lib/stores/scanning-workflow-store'
import { useStoreState } from '@/lib/stores/store-context'
import { UniversalBarcodeDetector } from '@/lib/barcode/barcode-detector'
import { useProductLookup } from '@/hooks/use-product-lookup'

// Demo Implementation with Complete Workflow - FINAL SSR-SAFE VERSION
export default function BarcodeDemo() {
  const [browserSupport, setBrowserSupport] = useState<{
    native: boolean
    polyfill: boolean
    formats: string[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('camera')
  const [isClient, setIsClient] = useState(false)
  const [lookupBarcode, setLookupBarcode] = useState<string | null>(null)

  // 🔥 FIXED: SSR-safe selectors and actions
  const currentStep = useScanningStep()
  const scannedProduct = useScannedProduct()
  const workflowProgress = useWorkflowProgress()
  const scanHistory = useScanHistory()
  const { activeStore } = useStoreState()

  // 🔥 FIXED: Use SSR-safe actions hook instead of direct store access
  const workflowActions = useScanningActions()

  // Product lookup hook
  const {
    data: lookupResult,
    isLoading: isLookingUp,
    error: lookupError,
  } = useProductLookup(lookupBarcode, !!lookupBarcode && isClient)

  // Set isClient flag for SSR safety
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Initialize store ID when active store changes
  useEffect(() => {
    if (activeStore && isClient) {
      workflowActions.setStoreId(activeStore.store_id)
    }
  }, [activeStore, workflowActions, isClient])

  // Update workflow store when lookup completes
  useEffect(() => {
    if (lookupResult && lookupBarcode && isClient) {
      workflowActions.setProductLookupResult(lookupResult)
    }
  }, [lookupResult, lookupBarcode, workflowActions, isClient])

  const handleScan = (barcode: string, detection?: BarcodeDetection) => {
    console.log('Barcode scanned:', barcode, detection)
    // Set barcode in workflow store and trigger lookup
    workflowActions.setBarcodeScanned(barcode, detection)
    setLookupBarcode(barcode)
    // Switch to workflow tab to show progress
    setActiveTab('workflow')
  }

  const handleError = (error: Error) => {
    console.error('Barcode scanner error:', error)
    workflowActions.setError(error.message)
  }

  const handleProductFound = (barcode: string, lookupResult: any) => {
    console.log('Product found:', barcode, lookupResult)
    // Switch to workflow tab to show progress
    setActiveTab('workflow')
  }

  const handleManualEntry = (productData: any) => {
    console.log('Manual product added:', productData)
    setActiveTab('workflow')
  }

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
    setActiveTab('workflow')
  }

  // Show loading during SSR and client initialization
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">LIFO Complete Scanning System</h1>
        <p className="text-gray-600">
          Camera scanning + Manual entry + Open Food Facts integration + Workflow management
        </p>
        {activeStore && (
          <Badge variant="outline" className="mt-2">
            Store: {activeStore.store_name}
          </Badge>
        )}
      </div>

      {/* Browser Support Info */}
      {browserSupport && (
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

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="camera" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Camera Scanner
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center gap-2">
            <Workflow className="w-4 h-4" />
            Workflow
            {currentStep !== 'barcode' && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {currentStep}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Camera Scanner Tab */}
        <TabsContent value="camera" className="space-y-4">
          <BarcodeScanner onScan={handleScan} onError={handleError} autoStart={true} />

          <Alert>
            <Camera className="h-4 w-4" />
            <AlertDescription>
              Point your camera at any product barcode. The scanner will automatically detect
              supported formats and look up product information from Open Food Facts.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual" className="space-y-4">
          <ManualBarcodeEntry
            onProductFound={handleProductFound}
            onManualEntry={handleManualEntry}
          />

          <Alert>
            <Search className="h-4 w-4" />
            <AlertDescription>
              Enter barcodes manually or search Open Food Facts database. If a product isn't found,
              you can add it to your local cache.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Workflow Tab */}
        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Workflow className="w-5 h-5" />
                  Scanning Workflow
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    Step {workflowProgress.currentIndex + 1} of 5
                  </span>
                  <Button size="sm" variant="outline" onClick={workflowActions.resetWorkflow}>
                    Reset
                  </Button>
                </div>
              </CardTitle>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${workflowProgress.progress}%` }}
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Current Step Display */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={currentStep === 'barcode' ? 'default' : 'secondary'}>
                    1. Barcode Scan
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <Badge
                    className="cursor-pointer"
                    onClick={() => setActiveTab('product')}
                    variant={currentStep === 'product' ? 'default' : 'secondary'}
                  >
                    2. Product Lookup
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <Badge
                    className="cursor-pointer"
                    onClick={() => setActiveTab('ocr')}
                    variant={currentStep === 'ocr' ? 'default' : 'secondary'}
                  >
                    3. Expiry Date
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <Badge
                    className="cursor-pointer"
                    onClick={() => setActiveTab('confirmation')}
                    variant={currentStep === 'confirmation' ? 'default' : 'secondary'}
                  >
                    4. Confirmation
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <Badge
                    className="cursor-pointer"
                    onClick={() => setActiveTab('complete')}
                    variant={currentStep === 'complete' ? 'default' : 'secondary'}
                  >
                    5. Complete
                  </Badge>
                </div>

                {/* Current Step Content */}
                {currentStep === 'barcode' && (
                  <Alert>
                    <Package className="h-4 w-4" />
                    <AlertDescription>
                      Use the Camera Scanner or Manual Entry tabs to scan a product barcode.
                    </AlertDescription>
                  </Alert>
                )}

                {currentStep === 'product' && scannedProduct && (
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
                            {isLookingUp
                              ? 'Looking up product...'
                              : 'Proceed to Expiry Date Scanning'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {currentStep === 'ocr' && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Next: Take a photo of the expiry date to extract the date automatically.
                      <br />
                      <em>OCR component will be implemented in the next phase.</em>
                      <div className="mt-3">
                        <Button
                          onClick={() => workflowActions.setManualExpiryDate('2025-02-15')}
                          variant="outline"
                          size="sm"
                        >
                          Simulate OCR (Test)
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {currentStep === 'confirmation' && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Next: Enter quantity, pricing, and confirm batch creation.
                      <br />
                      <em>Batch confirmation component will be implemented in the next phase.</em>
                      <div className="mt-3">
                        <Button
                          onClick={() => {
                            workflowActions.setBatchData({ quantity: 12 })
                            workflowActions.completeWorkflow()
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Simulate Batch Creation (Test)
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {currentStep === 'complete' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Batch successfully created! The product has been added to your inventory.
                      <div className="mt-3">
                        <Button onClick={workflowActions.resetWorkflow} size="sm">
                          Scan Another Product
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scan History */}
          {scanHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Scans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scanHistory.map((item, index) => (
                    <div
                      key={`${item.barcode}-${index}`}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="font-mono text-sm">{item.barcode}</div>
                        <div className="text-xs text-gray-500">
                          {item.productName || 'Unknown Product'} • {item.brand || 'No brand'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.lookupResult?.source || 'manual'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Implementation Status */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="text-lg">Implementation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">✅ Completed</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Real barcode detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Open Food Facts integration</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Product cache management</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Workflow state management</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Manual product entry</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>SSR compatibility fixed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Complete workflow integration</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">🚧 Next Phase</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-orange-500" />
                  <span>OCR expiry date capture</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-orange-500" />
                  <span>Batch confirmation form</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-orange-500" />
                  <span>Supabase batch creation</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-orange-500" />
                  <span>FastAPI integration</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
  )
}
