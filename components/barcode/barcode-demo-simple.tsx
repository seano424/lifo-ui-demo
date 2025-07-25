'use client'

import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, CheckCircle, Camera, Search, Package, Calendar, Loader2 } from 'lucide-react'

import BarcodeScanner, { BarcodeDetection } from '@/components/barcode/barcode-scanner'
import { useProductLookup, useProductSearch } from '@/hooks/use-product-lookup'
import { UniversalBarcodeDetector } from '@/lib/barcode/barcode-detector'

// Simplified Demo - No complex workflow, just core functionality
export default function SimplifiedScanningDemo() {
  const [browserSupport, setBrowserSupport] = useState<{
    native: boolean
    polyfill: boolean
    formats: string[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('manual')

  // Simple state management - no Zustand complexity
  const [currentBarcode, setCurrentBarcode] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [scannedProducts, setScannedProducts] = useState<any[]>([])

  // Product lookup hook - this is working!
  const {
    data: lookupResult,
    isLoading: isLookingUp,
    error: lookupError,
  } = useProductLookup(currentBarcode, currentBarcode.length >= 8)

  const productSearch = useProductSearch()

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

    checkSupport()
  }, [])

  // Handle barcode scan from camera
  const handleScan = (barcode: string, detection?: BarcodeDetection) => {
    console.log('Barcode scanned:', barcode, detection)
    setCurrentBarcode(barcode)
    setActiveTab('results') // Switch to results tab
  }

  // Handle manual barcode entry
  const handleManualBarcode = (barcode: string) => {
    setCurrentBarcode(barcode)
  }

  // Handle product search
  const handleProductSearch = async (query: string) => {
    if (query.length < 3) return
    await productSearch.mutateAsync(query)
  }

  // Add to batch (simulate final step)
  const handleAddToBatch = () => {
    if (!lookupResult?.found || !expiryDate || quantity < 1) return

    const newProduct = {
      barcode: currentBarcode,
      product: lookupResult.product,
      expiryDate,
      quantity,
      timestamp: new Date(),
      source: lookupResult.source,
    }

    setScannedProducts(prev => [newProduct, ...prev.slice(0, 9)])

    // Reset for next scan
    setCurrentBarcode('')
    setExpiryDate('')
    setQuantity(1)
    setActiveTab('manual')
  }

  // Test barcodes for easy testing (verified working)
  const testBarcodes = [
    { barcode: '3017624010701', name: 'Nutella' },
    { barcode: '737628064502', name: 'Thai Peanut Noodles' },
    { barcode: '078000113464', name: 'Orange Sunkist' },
  ]

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Initializing scanning system...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">LIFO Simplified Scanner</h1>
        <p className="text-gray-600">
          Scan barcodes → Look up products → Add expiry dates → Create batches
        </p>
      </div>

      {/* System Status */}
      {browserSupport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                <div className="text-xs text-gray-500 mt-2">
                  Supported: {browserSupport.formats.join(', ').toUpperCase()}
                </div>
              </div>

              <div className="space-y-1">
                <strong>Quick Test:</strong>
                <div className="space-y-1">
                  {testBarcodes.slice(0, 5).map(item => (
                    <Button
                      key={item.barcode}
                      size="sm"
                      variant="outline"
                      onClick={() => handleManualBarcode(item.barcode)}
                      className="text-xs h-7 w-full justify-start"
                    >
                      {item.name} - {item.barcode}
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
            Camera
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Results
            {currentBarcode && (
              <Badge variant="secondary" className="ml-1 text-xs">
                1
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Camera Scanner Tab */}
        <TabsContent value="camera" className="space-y-4">
          <BarcodeScanner
            onScan={handleScan}
            onError={error => console.error('Scanner error:', error)}
            autoStart={true}
          />
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Barcode Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={currentBarcode}
                  onChange={e => setCurrentBarcode(e.target.value)}
                  placeholder="Enter barcode (8+ digits)..."
                  className="font-mono"
                />
                <Button
                  onClick={() => handleManualBarcode(currentBarcode)}
                  disabled={currentBarcode.length < 8}
                >
                  Lookup
                </Button>
              </div>

              {/* Product Search */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Search Products</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search Open Food Facts..."
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleProductSearch(e.currentTarget.value)
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const input = document.querySelector(
                        'input[placeholder="Search Open Food Facts..."]',
                      ) as HTMLInputElement
                      if (input?.value) {
                        handleProductSearch(input.value)
                      }
                    }}
                    disabled={productSearch.isPending}
                  >
                    {productSearch.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Search Results */}
                {productSearch.data && productSearch.data.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <h5 className="text-sm font-medium">Search Results:</h5>
                    {productSearch.data.slice(0, 5).map((product: any) => (
                      <Button
                        key={product.code}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-auto p-3"
                        onClick={() => handleManualBarcode(product.code)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{product.product_name}</div>
                          <div className="text-xs text-gray-500">
                            {product.brands} • {product.code}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {currentBarcode ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Product Lookup Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <code className="bg-gray-100 px-2 py-1 rounded">{currentBarcode}</code>
                  {isLookingUp && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>

                {/* Lookup Results */}
                {lookupError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Error: {lookupError.message}</AlertDescription>
                  </Alert>
                )}

                {lookupResult && (
                  <div className="space-y-4">
                    {lookupResult.found ? (
                      <Alert>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <strong>Product Found!</strong>
                              <Badge variant="secondary">
                                {lookupResult.source === 'cache' ? 'Cached' : 'Live API'}
                              </Badge>
                            </div>

                            {lookupResult.product && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                <div className="space-y-2">
                                  <div>
                                    <strong>Name:</strong>{' '}
                                    {lookupResult.product.product_name ||
                                      lookupResult.product.product_name_en ||
                                      'Unknown'}
                                  </div>
                                  {lookupResult.product.brands && (
                                    <div>
                                      <strong>Brand:</strong> {lookupResult.product.brands}
                                    </div>
                                  )}
                                  {lookupResult.product.categories && (
                                    <div>
                                      <strong>Category:</strong>{' '}
                                      {lookupResult.product.categories.split(',')[0]}
                                    </div>
                                  )}
                                  {lookupResult.product.quantity && (
                                    <div>
                                      <strong>Size:</strong> {lookupResult.product.quantity}
                                    </div>
                                  )}
                                </div>

                                {lookupResult.product.image_front_url && (
                                  <div>
                                    <img
                                      src={lookupResult.product.image_front_url}
                                      alt="Product"
                                      className="w-24 h-24 object-cover rounded border"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Product not found in Open Food Facts database.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Add to Batch Form */}
                    {lookupResult.found && (
                      <Card className="border-green-200">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Add to Inventory
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">
                                Expiry Date *
                              </label>
                              <Input
                                type="date"
                                value={expiryDate}
                                onChange={e => setExpiryDate(e.target.value)}
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Quantity *</label>
                              <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={e => setQuantity(Number(e.target.value))}
                                required
                              />
                            </div>
                          </div>

                          <Button
                            onClick={handleAddToBatch}
                            disabled={!expiryDate || quantity < 1}
                            className="w-full"
                          >
                            <Package className="w-4 h-4 mr-2" />
                            Add to Batch
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <Search className="h-4 w-4" />
              <AlertDescription>
                Enter a barcode in the Manual Entry tab or scan with Camera to see results here.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      {/* Recent Batches */}
      {scannedProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Batches Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scannedProducts.map((item, index) => (
                <div
                  key={`${item.barcode}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      {item.product?.product_name ||
                        item.product?.product_name_en ||
                        'Unknown Product'}
                    </div>
                    <div className="text-sm text-gray-500">
                      <code>{item.barcode}</code> • Expires: {item.expiryDate} • Qty:{' '}
                      {item.quantity} •{item.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.source}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
