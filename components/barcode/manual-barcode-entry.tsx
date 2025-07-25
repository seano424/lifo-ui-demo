'use client'

import React, { useState, useEffect } from 'react'
import { Search, Package, Scan, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  useProductLookup,
  useProductSearch,
  useAddProductToCache,
} from '@/hooks/use-product-lookup'
import { useScanningWorkflowStore } from '@/lib/stores/scanning-workflow-store'

interface ManualBarcodeEntryProps {
  onProductFound?: (barcode: string, lookupResult: any) => void
  onManualEntry?: (productData: any) => void
  className?: string
  onClose?: () => void
}

export default function ManualBarcodeEntry({
  onProductFound,
  onManualEntry,
  className = '',
  onClose,
}: ManualBarcodeEntryProps) {
  const [barcode, setBarcode] = useState('')
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [manualProductData, setManualProductData] = useState({
    productName: '',
    brand: '',
    category: '',
    imageUrl: '',
    barcode: '',
  })

  // Workflow store actions
  const { setBarcodeScanned, setProductLookupResult, setManualProductEntry, scanHistory } =
    useScanningWorkflowStore()

  // React Query hooks
  const {
    data: lookupResult,
    isLoading: isLookingUp,
    error: lookupError,
    refetch: refetchLookup,
  } = useProductLookup(barcode, barcode.length >= 8)

  const productSearch = useProductSearch()
  const addToCache = useAddProductToCache()

  // Handle barcode submission
  const handleBarcodeSubmit = async () => {
    if (!barcode || barcode.length < 8) return

    // Set barcode in workflow store
    setBarcodeScanned(barcode, {
      format: 'Manual Entry',
      rawValue: barcode,
      confidence: 1.0,
    })

    // The lookup will happen automatically via the useProductLookup hook
  }

  // Handle product search
  const handleProductSearch = async (query: string) => {
    if (query.length < 3) return
    await productSearch.mutateAsync(query)
  }

  // Handle manual product entry
  const handleManualProductSubmit = async () => {
    if (!barcode || !manualProductData.productName) return

    try {
      // Add to cache first
      await addToCache.mutateAsync({
        ...manualProductData,
        barcode,
      })

      // Set in workflow store
      setManualProductEntry(manualProductData)

      // Call parent callback
      onManualEntry?.({
        ...manualProductData,
        barcode,
      })

      // Reset form
      setManualProductData({
        productName: '',
        brand: '',
        category: '',
        imageUrl: '',
        barcode: '',
      })
      setShowProductSearch(false)
    } catch (error) {
      console.error('Failed to add product:', error)
    }
  }

  // Update workflow store when lookup completes
  useEffect(() => {
    if (lookupResult && barcode) {
      setProductLookupResult(lookupResult)
      onProductFound?.(barcode, lookupResult)
    }
  }, [lookupResult, barcode, setProductLookupResult, onProductFound])

  // Quick rescan from history
  const handleQuickRescan = (historyItem: any) => {
    setBarcode(historyItem.barcode)
    setBarcodeScanned(historyItem.barcode, {
      format: 'Manual Entry',
      rawValue: historyItem.barcode,
      confidence: 1.0,
    })
  }

  return (
    <div className={`manual-barcode-entry space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Manual Product Entry
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Barcode Input Section */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && barcode.length >= 8) {
                      handleBarcodeSubmit()
                    }
                  }}
                  placeholder="Enter barcode number (8+ digits)..."
                  className="font-mono"
                  disabled={isLookingUp}
                />
              </div>
              <Button
                onClick={handleBarcodeSubmit}
                disabled={barcode.length < 8 || isLookingUp}
                className="shrink-0"
              >
                {isLookingUp ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Lookup
              </Button>
            </div>

            {/* Barcode validation feedback */}
            {barcode && barcode.length < 8 && (
              <p className="text-xs text-orange-600">Barcode must be at least 8 digits long</p>
            )}
          </div>

          {/* Lookup Results */}
          {lookupError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to lookup product: {lookupError.message}</AlertDescription>
            </Alert>
          )}

          {lookupResult && (
            <div className="space-y-3">
              {lookupResult.found ? (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div>
                        <strong>Product Found!</strong>
                        <Badge variant="secondary" className="ml-2">
                          {lookupResult.source === 'cache' ? 'Cached' : 'Live API'}
                        </Badge>
                      </div>
                      {lookupResult.product && (
                        <div className="text-sm space-y-1">
                          <div>
                            <strong>Name:</strong>{' '}
                            {lookupResult.product.product_name ||
                              lookupResult.product.product_name_en}
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
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Product not found in database. You can add it manually below.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Manual Product Entry (shown when product not found) */}

          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                Add Product Manually
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Product Name *</label>
                  <Input
                    value={manualProductData.productName}
                    onChange={e =>
                      setManualProductData(prev => ({
                        ...prev,
                        productName: e.target.value,
                      }))
                    }
                    placeholder="e.g., Organic Whole Milk"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Barcode *</label>
                  <Input
                    value={manualProductData.barcode}
                    onChange={e =>
                      setManualProductData(prev => ({
                        ...prev,
                        barcode: e.target.value,
                      }))
                    }
                    placeholder="e.g., 078000113464"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Brand</label>
                    <Input
                      value={manualProductData.brand}
                      onChange={e =>
                        setManualProductData(prev => ({
                          ...prev,
                          brand: e.target.value,
                        }))
                      }
                      placeholder="e.g., Danone"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Category</label>
                    <Input
                      value={manualProductData.category}
                      onChange={e =>
                        setManualProductData(prev => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      placeholder="e.g., Dairy"
                    />
                  </div>
                </div>
              </div>

              {/* Product Search Helper */}
              <div className="border-t pt-3">
                <div className="flex gap-2 w-full">
                  <Input
                    placeholder="Search Open Food Facts..."
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleProductSearch(e.currentTarget.value)
                      }
                    }}
                    className="text-xs w-full"
                  />
                  <Button
                    size="sm"
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
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Search className="w-3 h-3" />
                    )}
                  </Button>
                </div>

                {/* Search Results */}
                {productSearch.data && productSearch.data.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {productSearch.data.slice(0, 5).map((product: any) => (
                      <Button
                        key={product.code}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs h-auto p-2"
                        onClick={() => {
                          setManualProductData({
                            productName: product.product_name || 'Unknown Product',
                            brand: product.brands || '',
                            category: '',
                            imageUrl: product.image_front_small_url || '',
                            barcode: product.code,
                          })
                          setBarcode(product.code)
                        }}
                      >
                        <div className="text-left">
                          <div className="font-medium">{product.product_name}</div>
                          {product.brands && <div className="text-gray-500">{product.brands}</div>}
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleManualProductSubmit}
                  disabled={!manualProductData.productName || !barcode || addToCache.isPending}
                  className="flex-1"
                >
                  {addToCache.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Package className="w-4 h-4 mr-2" />
                  )}
                  Add Product
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowProductSearch(false)
                    setManualProductData({
                      productName: '',
                      brand: '',
                      category: '',
                      imageUrl: '',
                      barcode: '',
                    })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Rescan from History */}
          {scanHistory.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-600">Recent Scans</h4>
              <div className="grid grid-cols-1 gap-1">
                {scanHistory.slice(0, 3).map((item, index) => (
                  <Button
                    key={`${item.barcode}-${index}`}
                    variant="ghost"
                    size="sm"
                    className="justify-between h-auto p-2 text-xs"
                    onClick={() => handleQuickRescan(item)}
                  >
                    <div className="text-left">
                      <div className="font-mono">{item.barcode}</div>
                      <div className="text-gray-500">{item.productName || 'Unknown Product'}</div>
                    </div>
                    <Scan className="w-3 h-3" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Enter a barcode to look up product information</p>
            <p>• If not found, you can add the product manually</p>
            <p>• Use search to find similar products in the database</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
