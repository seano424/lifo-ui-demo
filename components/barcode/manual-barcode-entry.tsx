'use client'

import React, { useState } from 'react'
import { Search, Package, Loader2, AlertCircle, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useProductLookup, useProductSearch } from '@/hooks/use-product-lookup'
import { useScanningActions } from '@/lib/stores/scanning-workflow-store'
import { Typography } from '@/components/ui/typography'
import type { ProductLookupResult, OpenFoodFactsSearchResult } from '@/lib/queries/open-food-facts'

interface ProductData {
  barcode: string
  productName: string
  brand: string
  category: string
  imageUrl: string
  isManualEntry: boolean
  lookupResult?: unknown
}

interface ManualBarcodeEntryProps {
  onProductSelected?: (barcode: string, productData: ProductData) => void
  onClose?: () => void
  className?: string
}

export default function ManualBarcodeEntry({
  onProductSelected,
  onClose,
  className = '',
}: ManualBarcodeEntryProps) {
  const [barcode, setBarcode] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null)
  const [manualProductData, setManualProductData] = useState({
    productName: '',
    brand: '',
    category: '',
    imageUrl: '',
  })

  const { setProductSelected } = useScanningActions()

  const {
    data: lookupResult,
    isLoading: isLookingUp,
    error: lookupError,
  } = useProductLookup(barcode, barcode.length >= 8)

  const productSearch = useProductSearch()

  const handleBarcodeSubmit = async () => {
    if (!barcode || barcode.length < 8) return
  }

  const handleProductSearch = async (query: string) => {
    if (query.length < 3) return
    await productSearch.mutateAsync(query)
  }

  const handleConfirmAndProceed = () => {
    if (!selectedProduct) return

    setProductSelected({
      barcode: selectedProduct.barcode,
      productName: selectedProduct.productName,
      brand: selectedProduct.brand,
      category: selectedProduct.category,
      imageUrl: selectedProduct.imageUrl,
      isManualEntry: true,
      lookupResult: selectedProduct.lookupResult as ProductLookupResult | undefined,
    })

    onProductSelected?.(selectedProduct.barcode, selectedProduct)

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
          {selectedProduct && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <Typography variant="h3">Product Selected</Typography>
                    <div className="text-sm mt-1 space-y-1">
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
                    Select Product
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                    Change
                  </Button>
                </div>
                <Alert className="mt-3">
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs">
                    Will automatically proceed to expiry date scanning after selection
                  </AlertDescription>
                </Alert>
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

                {barcode && barcode.length < 8 && (
                  <p className="text-xs text-orange-600">Barcode must be at least 8 digits long</p>
                )}
              </div>

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
                    <Card>
                      <CardContent className="p-4">
                        <Typography variant="h3">Product Found!</Typography>

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
                                {lookupResult.product.categories
                                  ? String(lookupResult.product.categories).split(',')[0]?.trim()
                                  : 'Unknown'}
                              </div>
                            )}
                          </div>
                        )}

                        <Button
                          onClick={() => {
                            if (lookupResult.product) {
                              const productData = {
                                barcode,
                                productName: (lookupResult.product.product_name ||
                                  lookupResult.product.product_name_en ||
                                  'Unknown Product') as string,
                                brand: (lookupResult.product.brands || '') as string,
                                category: (lookupResult.product.categories
                                  ? String(lookupResult.product.categories).split(',')[0]?.trim() ||
                                    ''
                                  : '') as string,
                                imageUrl: (lookupResult.product.image_front_url ||
                                  lookupResult.product.image_url ||
                                  '') as string,
                                isManualEntry: true,
                                lookupResult: lookupResult as ProductLookupResult | undefined,
                              }

                              setProductSelected(productData)

                              onProductSelected?.(barcode, productData)

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
                          }}
                          className="w-full mt-3"
                          disabled={!lookupResult.product}
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
                          {productSearch.data
                            .slice(0, 5)
                            .map((product: OpenFoodFactsSearchResult) => (
                              <Button
                                key={product.code}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs h-auto p-2"
                                onClick={() => {
                                  const productData = {
                                    barcode: product.code,
                                    productName: (product.product_name ||
                                      'Unknown Product') as string,
                                    brand: (product.brands || '') as string,
                                    category: '', // categories not available in search results
                                    imageUrl: (product.image_front_small_url || '') as string,
                                    isManualEntry: true,
                                  }

                                  setProductSelected(productData)

                                  onProductSelected?.(product.code, productData)

                                  setSelectedProduct(null)
                                  setBarcode('')
                                  setManualProductData({
                                    productName: '',
                                    brand: '',
                                    category: '',
                                    imageUrl: '',
                                  })
                                  onClose?.()
                                }}
                              >
                                <div className="text-left">
                                  <div className="font-medium">
                                    {product.product_name || 'Unknown Product'}
                                  </div>
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
                      onClick={() => {
                        if (!manualProductData.productName || !barcode) return

                        const productData = {
                          barcode,
                          productName: manualProductData.productName,
                          brand: manualProductData.brand,
                          category: manualProductData.category,
                          imageUrl: manualProductData.imageUrl,
                          isManualEntry: true,
                        }

                        setProductSelected(productData)

                        onProductSelected?.(barcode, productData)

                        setSelectedProduct(null)
                        setBarcode('')
                        setManualProductData({
                          productName: '',
                          brand: '',
                          category: '',
                          imageUrl: '',
                        })
                        onClose?.()
                      }}
                      disabled={!manualProductData.productName || !barcode}
                      className="w-full"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Select This Product
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
