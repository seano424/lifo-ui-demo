'use client'

import React, { useState } from 'react'
import {
  Search,
  Package,
  Scan,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useProductLookup, useProductSearch } from '@/hooks/use-product-lookup'
import { useScanningActions, useScanHistory } from '@/lib/stores/scanning-workflow-store'

interface ManualBarcodeEntryProps {
  onProductSelected?: (barcode: string, productData: any) => void
  onClose?: () => void
  className?: string
}

export default function ManualBarcodeEntry({
  onProductSelected,
  onClose,
  className = '',
}: ManualBarcodeEntryProps) {
  const [barcode, setBarcode] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [manualProductData, setManualProductData] = useState({
    productName: '',
    brand: '',
    category: '',
    imageUrl: '',
  })

  // 🔥 NEW: Get the new setProductSelected action
  const { setProductSelected } = useScanningActions()
  const scanHistory = useScanHistory()

  // React Query hooks
  const {
    data: lookupResult,
    isLoading: isLookingUp,
    error: lookupError,
  } = useProductLookup(barcode, barcode.length >= 8)

  const productSearch = useProductSearch()

  // Handle barcode submission - just for lookup, don't update workflow yet
  const handleBarcodeSubmit = async () => {
    if (!barcode || barcode.length < 8) return
    // Don't call workflow actions here - just let the lookup happen
  }

  // Handle product search
  const handleProductSearch = async (query: string) => {
    if (query.length < 3) return
    await productSearch.mutateAsync(query)
  }

  // Handle selecting a product (either from lookup or search results)
  const handleSelectProduct = (productData: any, sourceBarcode?: string) => {
    const finalBarcode = sourceBarcode || barcode

    // Create normalized product data
    const normalizedProduct = {
      barcode: finalBarcode,
      productName: productData.product_name || productData.productName || 'Unknown Product',
      brand: productData.brands || productData.brand || '',
      category: productData.categories?.split(',')[0] || productData.category || '',
      imageUrl: productData.image_front_url || productData.image_url || productData.imageUrl || '',
      isManualEntry: true,
      // Include lookup result if this came from a lookup
      lookupResult: lookupResult && sourceBarcode === barcode ? lookupResult : undefined,
    }

    setSelectedProduct(normalizedProduct)
  }

  // Handle selecting manual product data
  const handleSelectManualProduct = () => {
    if (!manualProductData.productName || !barcode) return

    const normalizedProduct = {
      barcode,
      productName: manualProductData.productName,
      brand: manualProductData.brand,
      category: manualProductData.category,
      imageUrl: manualProductData.imageUrl,
      isManualEntry: true,
    }

    setSelectedProduct(normalizedProduct)
  }

  // 🔥 FIXED: Handle confirming the selected product and moving to next step
  const handleConfirmAndProceed = () => {
    if (!selectedProduct) return

    // 🔥 Use the new setProductSelected action that skips the intermediate step
    setProductSelected({
      barcode: selectedProduct.barcode,
      productName: selectedProduct.productName,
      brand: selectedProduct.brand,
      category: selectedProduct.category,
      imageUrl: selectedProduct.imageUrl,
      isManualEntry: true,
      lookupResult: selectedProduct.lookupResult,
    })

    // Call parent callback
    onProductSelected?.(selectedProduct.barcode, selectedProduct)

    // Reset and close
    setSelectedProduct(null)
    setBarcode('')
    setManualProductData({
      productName: '',
      brand: '',
      category: '',
      imageUrl: '',
    })
    onClose?.()
  }

  // Quick rescan from history
  const handleQuickRescan = (historyItem: any) => {
    const normalizedProduct = {
      barcode: historyItem.barcode,
      productName: historyItem.productName || 'Unknown Product',
      brand: historyItem.brand || '',
      category: historyItem.category || '',
      imageUrl: historyItem.imageUrl || '',
      isManualEntry: true,
    }
    setSelectedProduct(normalizedProduct)
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
          {/* Show selected product if any */}
          {selectedProduct && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-green-800">Product Selected</h3>
                    <div className="text-sm text-green-700 mt-1 space-y-1">
                      <div>
                        <strong>Name:</strong> {selectedProduct.productName}
                      </div>
                      {selectedProduct.brand && (
                        <div>
                          <strong>Brand:</strong> {selectedProduct.brand}
                        </div>
                      )}
                      {selectedProduct.category && (
                        <div>
                          <strong>Category:</strong> {selectedProduct.category}
                        </div>
                      )}
                      <div>
                        <strong>Barcode:</strong>{' '}
                        <code className="text-xs">{selectedProduct.barcode}</code>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={handleConfirmAndProceed}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Proceed to Expiry Date
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                    Change
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedProduct && (
            <>
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
                  <AlertDescription>
                    Failed to lookup product: {lookupError.message}
                  </AlertDescription>
                </Alert>
              )}

              {lookupResult && (
                <div className="space-y-3">
                  {lookupResult.found ? (
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">Product Found!</span>
                          <Badge variant="secondary" className="ml-auto">
                            {lookupResult.source === 'cache' ? 'Cached' : 'Live API'}
                          </Badge>
                        </div>

                        {lookupResult.product && (
                          <div className="text-sm space-y-2">
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

                        <Button
                          onClick={() => handleSelectProduct(lookupResult.product)}
                          className="w-full mt-3"
                        >
                          Select This Product
                        </Button>
                      </CardContent>
                    </Card>
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

              {/* Manual Product Entry */}
              {!lookupResult?.found && (
                <div className="border-dashed border-2 p-4 rounded-xl">
                  <div className="pb-3">
                    <div className="text-sm flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Add Product Manually
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Barcode *</label>
                        <Input
                          value={barcode}
                          onChange={e => setBarcode(e.target.value)}
                          placeholder="e.g., 078000113464"
                          className="font-mono"
                          required
                        />
                      </div>

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

                      {productSearch.data && productSearch.data.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                          {productSearch.data.slice(0, 5).map((product: any) => (
                            <Button
                              key={product.code}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-auto p-2"
                              onClick={() => handleSelectProduct(product, product.code)}
                            >
                              <div className="text-left">
                                <div className="font-medium">{product.product_name}</div>
                                {product.brands && (
                                  <div className="text-gray-500">{product.brands}</div>
                                )}
                              </div>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleSelectManualProduct}
                      disabled={!manualProductData.productName || !barcode}
                      className="w-full"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Select This Product
                    </Button>
                  </div>
                </div>
              )}

              {/* Instructions */}
              {/* <div className="text-xs text-gray-500 space-y-1">
                <p>• Enter a barcode to look up product information</p>
                <p>• If not found, you can add the product manually</p>
                <p>• Use search to find similar products in the database</p>
                <p>• Select a product to proceed directly to expiry date entry</p>
              </div> */}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
