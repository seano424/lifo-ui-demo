'use client'

import {
  AlertCircle,
  ArrowRight,
  Check,
  Loader2,
  Package,
  Search,
  Keyboard,
} from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Typography } from '@/components/ui/typography'
import { useCategories } from '@/hooks/use-categories'
import {
  type SupabaseProductSearchResult,
  useProductLookup,
  useProductSearch,
  useSupabaseProductSearch,
} from '@/hooks/use-product-lookup'
import type {
  OpenFoodFactsSearchResult,
  ProductLookupResult,
} from '@/lib/queries/open-food-facts'
import { useScanningActions } from '@/lib/stores/scanning-workflow-store'
import { useStoreState } from '@/lib/stores/store-context'
import { createClient } from '@/lib/supabase/client'
import { Label } from '../ui/label'

interface ProductData {
  barcode: string
  productName: string
  brand: string
  category: string
  imageUrl: string
  isManualEntry: boolean
  lookupResult?: unknown
  productId?: string // For Supabase products without barcodes
}

interface ManualBarcodeEntryProps {
  onProductSelected?: (barcode: string, productData: ProductData) => void
  className?: string
  mode?: 'inbound' | 'outbound' // Determines which API to use
  storeId?: string // Required for outbound mode to filter products by store
}

export default function ManualBarcodeEntry({
  onProductSelected,
  className = '',
  mode = 'inbound', // Default to inbound for backward compatibility
  storeId,
}: ManualBarcodeEntryProps) {
  const { getCategoriesForDropdown, isLoading: categoriesLoading } =
    useCategories()

  const [barcode, setBarcode] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(
    null
  )
  const [manualProductData, setManualProductData] = useState({
    productName: '',
    brand: '',
    category: '',
    imageUrl: '',
  })

  const { setProductSelected } = useScanningActions()
  const { activeStore } = useStoreState()

  const {
    data: lookupResult,
    isLoading: isLookingUp,
    error: lookupError,
  } = useProductLookup(barcode, barcode.length >= 8)

  const productSearch = useProductSearch() // OpenFoodFacts search
  const supabaseSearch = useSupabaseProductSearch(storeId) // Supabase search
  const [productNameQuery, setProductNameQuery] = useState('')
  const [showProductSearchResults, setShowProductSearchResults] =
    useState(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Use the appropriate search based on mode
  const activeSearch = mode === 'outbound' ? supabaseSearch : productSearch

  const [barcodeStockStatus, setBarcodeStockStatus] = useState<{
    hasStock: boolean
    availableQuantity: number
  } | null>(null)

  const handleBarcodeSubmit = async () => {
    if (!barcode || barcode.length < 8) return
    setBarcodeStockStatus(null) // Reset stock status
  }

  // Check stock status when lookup result changes in outbound mode
  const checkStockStatus = useCallback(
    async (barcode: string) => {
      if (mode !== 'outbound' || !storeId || !activeStore) {
        return
      }

      try {
        const supabase = createClient()
        const { data: batches, error } = await supabase
          .schema('inventory')
          .from('batches')
          .select('current_quantity, products!inner(barcode)')
          .eq('products.barcode', barcode)
          .eq('store_id', storeId)
          .eq('status', 'active')
          .gte('current_quantity', 0)

        if (error) {
          console.error('Error checking stock status:', error)
          return
        }

        const totalStock =
          batches?.reduce((sum, batch) => sum + batch.current_quantity, 0) || 0
        setBarcodeStockStatus({
          hasStock: totalStock > 0,
          availableQuantity: totalStock,
        })
      } catch (error) {
        console.error('Error checking stock status:', error)
      }
    },
    [mode, storeId, activeStore]
  )

  // Check stock when lookup result changes
  React.useEffect(() => {
    if (lookupResult?.found && lookupResult.product && mode === 'outbound') {
      checkStockStatus(barcode)
    }
  }, [lookupResult, barcode, mode, checkStockStatus])

  const handleProductSearch = async (query: string) => {
    if (query.length < 3) return
    await productSearch.mutateAsync(query)
  }

  // Debounced search function
  const debouncedProductNameSearch = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setShowProductSearchResults(false)
        return
      }

      try {
        if (mode === 'outbound') {
          if (!storeId) {
            console.error('Store ID is required for outbound product search')
            return
          }
          await supabaseSearch.mutateAsync(query)
        } else {
          await productSearch.mutateAsync(query)
        }
        setShowProductSearchResults(true)
      } catch (error) {
        console.error('Product search error:', error)
        setShowProductSearchResults(false)
      }
    },
    [mode, storeId, supabaseSearch, productSearch]
  )

  const handleProductNameSearch = useCallback(
    (query: string) => {
      // Clear previous timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
        debounceTimeoutRef.current = null
      }

      // If query is too short, hide results immediately
      if (query.length < 2) {
        setShowProductSearchResults(false)
        return
      }

      // Set new timeout for debounced search
      debounceTimeoutRef.current = setTimeout(() => {
        debouncedProductNameSearch(query)
        debounceTimeoutRef.current = null
      }, 300) // 300ms debounce delay
    },
    [debouncedProductNameSearch]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const handleConfirmAndProceed = () => {
    if (!selectedProduct) return

    setProductSelected({
      barcode: selectedProduct.barcode,
      productName: selectedProduct.productName,
      brand: selectedProduct.brand,
      category: selectedProduct.category,
      imageUrl: selectedProduct.imageUrl,
      isManualEntry: true,
      lookupResult: selectedProduct.lookupResult as
        | ProductLookupResult
        | undefined,
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
  }

  return (
    <div className={`space-y-4 max-w-2xl mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              {mode === 'outbound' ? 'Manual Search' : 'Manual Entry'}
            </CardTitle>
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
                        <code className="text-xs">
                          {selectedProduct.barcode}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={handleConfirmAndProceed}
                    className="flex-1 bg-primary-600 hover:bg-primary-700"
                  >
                    Select Product
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedProduct(null)}
                  >
                    Change
                  </Button>
                </div>
                <Alert className="mt-3">
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs">
                    Will automatically proceed to expiry date scanning after
                    selection
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {!selectedProduct && (
            <>
              <div className="space-y-4">
                {/* Barcode Lookup */}
                <div className="space-y-2">
                  <Label>Search by Barcode</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && barcode.length >= 8) {
                          handleBarcodeSubmit()
                        }
                      }}
                      placeholder="Barcode number (8+ digits)..."
                      className="font-mono"
                      disabled={isLookingUp}
                    />

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
                    <p className="text-xs text-orange-600">
                      Barcode must be at least 8 digits long
                    </p>
                  )}
                </div>

                {/* Product Name Search */}
                <div className="space-y-2">
                  <Label>
                    Or Search by Product Name
                    {mode === 'outbound' && (
                      <span className="text-xs text-gray-500 ml-2">
                        (In-stock items only)
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={productNameQuery}
                      onChange={(e) => {
                        setProductNameQuery(e.target.value)
                        handleProductNameSearch(e.target.value)
                      }}
                      placeholder={
                        mode === 'outbound'
                          ? 'Search products in inventory...'
                          : 'Search Open Food Facts database...'
                      }
                      disabled={activeSearch.isPending}
                    />
                    {activeSearch.isPending && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {showProductSearchResults &&
                    activeSearch.data &&
                    activeSearch.data.length > 0 && (
                      <div className="border rounded-lg max-h-64 overflow-y-auto bg-white shadow-lg">
                        {mode === 'outbound'
                          ? // Supabase results for outbound
                            (
                              activeSearch.data as SupabaseProductSearchResult[]
                            ).map((product) => (
                              <Button
                                key={product.product_id}
                                variant="subtleGray"
                                className={`w-full rounded-none justify-start text-left p-3 ${
                                  product.isOutOfStock && 'cursor-not-allowed'
                                }`}
                                disabled={product.isOutOfStock}
                                onClick={() => {
                                  if (product.isOutOfStock) return

                                  // For outbound/Supabase results, use the product_id if no barcode exists
                                  // This ensures we have a unique identifier that won't cause lookup failures
                                  const effectiveBarcode =
                                    product.barcode &&
                                    product.barcode.trim() !== ''
                                      ? product.barcode
                                      : `INTERNAL-${product.product_id}`

                                  const productData = {
                                    barcode: effectiveBarcode,
                                    productName: product.name,
                                    brand: product.brand || '',
                                    category: product.category || '',
                                    imageUrl: product.image_url || '',
                                    isManualEntry: true,
                                    // Store the actual product_id for outbound operations
                                    productId: product.product_id,
                                  }

                                  setProductSelected(productData)
                                  onProductSelected?.(
                                    effectiveBarcode,
                                    productData
                                  )

                                  // Reset search
                                  setProductNameQuery('')
                                  setShowProductSearchResults(false)
                                  setBarcode('')
                                }}
                              >
                                <div className="flex-1">
                                  <Typography variant="p">
                                    {product.name}
                                  </Typography>
                                  {product.brand && (
                                    <Typography variant="p">
                                      {product.brand}
                                    </Typography>
                                  )}
                                  {product.isOutOfStock ? (
                                    <Typography
                                      variant="small"
                                      className="text-red-600"
                                    >
                                      Out of Stock
                                    </Typography>
                                  ) : product.total_available_quantity ? (
                                    <Typography
                                      variant="small"
                                      className="text-primary-900"
                                    >
                                      {product.total_available_quantity} units
                                      available
                                      {product.batch_count &&
                                        product.batch_count > 1 &&
                                        ` (${product.batch_count} batches)`}
                                    </Typography>
                                  ) : null}
                                </div>
                              </Button>
                            ))
                          : // OpenFoodFacts results for inbound
                            (
                              activeSearch.data as OpenFoodFactsSearchResult[]
                            ).map((product) => (
                              <Button
                                key={product.code}
                                variant="ghost"
                                className="w-full justify-start text-left p-3 hover:bg-gray-50"
                                onClick={() => {
                                  const productData = {
                                    barcode: product.code,
                                    productName:
                                      product.product_name || 'Unknown Product',
                                    brand: product.brands || '',
                                    category: '',
                                    imageUrl:
                                      product.image_front_small_url || '',
                                    isManualEntry: true,
                                  }

                                  setProductSelected(productData)
                                  onProductSelected?.(product.code, productData)

                                  // Reset search
                                  setProductNameQuery('')
                                  setShowProductSearchResults(false)
                                  setBarcode('')
                                }}
                              >
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {product.product_name || 'Unknown Product'}
                                  </div>
                                  {product.brands && (
                                    <div className="text-sm text-gray-500">
                                      {product.brands}
                                    </div>
                                  )}
                                </div>
                              </Button>
                            ))}
                      </div>
                    )}

                  {showProductSearchResults &&
                    activeSearch.data &&
                    activeSearch.data.length === 0 && (
                      <div className="text-sm text-gray-500 p-3 border rounded-lg">
                        No products found matching "{productNameQuery}"
                      </div>
                    )}
                </div>
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
                        {/* Show different status based on stock availability in outbound mode */}
                        {mode === 'outbound' && barcodeStockStatus !== null ? (
                          barcodeStockStatus.hasStock ? (
                            <div className="flex justify-center items-center gap-2">
                              <Check className="w-6 h-6 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
                              <Typography
                                variant="h3"
                                className="text-primary-800 font-black"
                              >
                                Product Found!
                              </Typography>
                            </div>
                          ) : (
                            <div className="flex justify-center items-center gap-2">
                              <AlertCircle className="w-6 h-6 text-red-600" />
                              <Typography
                                variant="h3"
                                className="text-red-600 font-black"
                              >
                                Out of Stock
                              </Typography>
                            </div>
                          )
                        ) : (
                          <div className="flex justify-center items-center gap-2">
                            <Check className="w-6 h-6 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
                            <Typography
                              variant="h3"
                              className="text-primary-800 font-black"
                            >
                              Product Found!
                            </Typography>
                          </div>
                        )}

                        {lookupResult.product && (
                          <div className="text-sm space-y-2">
                            <div>
                              <strong>Name:</strong>{' '}
                              {lookupResult.product.product_name ||
                                lookupResult.product.product_name_en}
                            </div>
                            {lookupResult.product.brands && (
                              <div>
                                <strong>Brand:</strong>{' '}
                                {lookupResult.product.brands}
                              </div>
                            )}
                            {lookupResult.product.categories && (
                              <div>
                                <strong>Category:</strong>{' '}
                                {lookupResult.product.categories
                                  ? String(lookupResult.product.categories)
                                      .split(',')[0]
                                      ?.trim()
                                  : 'Unknown'}
                              </div>
                            )}

                            {/* Show stock information for outbound mode */}
                            {mode === 'outbound' &&
                              barcodeStockStatus !== null && (
                                <div>
                                  <strong>Stock:</strong>{' '}
                                  {barcodeStockStatus.hasStock ? (
                                    <span className="text-primary-600">
                                      {barcodeStockStatus.availableQuantity}{' '}
                                      units available
                                    </span>
                                  ) : (
                                    <span className="text-red-600">
                                      No stock available in this store
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>
                        )}

                        <Button
                          onClick={() => {
                            if (lookupResult.product) {
                              const productData = {
                                barcode,
                                productName: (lookupResult.product
                                  .product_name ||
                                  lookupResult.product.product_name_en ||
                                  'Unknown Product') as string,
                                brand: (lookupResult.product.brands ||
                                  '') as string,
                                category: (lookupResult.product.categories
                                  ? String(lookupResult.product.categories)
                                      .split(',')[0]
                                      ?.trim() || ''
                                  : '') as string,
                                imageUrl: (lookupResult.product
                                  .image_front_url ||
                                  lookupResult.product.image_url ||
                                  '') as string,
                                isManualEntry: true,
                                lookupResult: lookupResult as
                                  | ProductLookupResult
                                  | undefined,
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
                            }
                          }}
                          className={`w-full mt-3 ${
                            mode === 'outbound' &&
                            barcodeStockStatus !== null &&
                            !barcodeStockStatus.hasStock
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                          disabled={
                            !lookupResult.product ||
                            (mode === 'outbound' &&
                              barcodeStockStatus !== null &&
                              !barcodeStockStatus.hasStock)
                          }
                        >
                          {mode === 'outbound' &&
                          barcodeStockStatus !== null &&
                          !barcodeStockStatus.hasStock
                            ? 'Out of Stock - Cannot Select'
                            : 'Select This Product'}
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Product not found in database. You can add it manually
                        below.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {!lookupResult?.found && mode === 'inbound' && (
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
                        <Label>Barcode *</Label>
                        <Input
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          placeholder="e.g., 078000113464"
                          className="font-mono"
                          required
                        />
                      </div>

                      <div>
                        <Label>Product Name *</Label>
                        <Input
                          value={manualProductData.productName}
                          onChange={(e) =>
                            setManualProductData((prev) => ({
                              ...prev,
                              productName: e.target.value,
                            }))
                          }
                          placeholder="e.g., Organic Whole Milk"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <Label>Brand</Label>
                          <Input
                            value={manualProductData.brand}
                            onChange={(e) =>
                              setManualProductData((prev) => ({
                                ...prev,
                                brand: e.target.value,
                              }))
                            }
                            placeholder="e.g., Danone"
                          />
                        </div>

                        <div>
                          <Label>Category</Label>
                          <Select
                            value={manualProductData.category}
                            onValueChange={(value) =>
                              setManualProductData((prev) => ({
                                ...prev,
                                category: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoriesLoading ? (
                                <div className="px-2 py-6 text-sm text-muted-foreground text-center">
                                  Loading categories...
                                </div>
                              ) : (
                                getCategoriesForDropdown().map(
                                  (category: {
                                    value: string
                                    label: string
                                    code: string
                                  }) => (
                                    <SelectItem
                                      key={category.value}
                                      value={category.value}
                                    >
                                      {category.label}
                                    </SelectItem>
                                  )
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex gap-2 w-full">
                        <Input
                          placeholder="Search Open Food Facts..."
                          onKeyDown={(e) => {
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
                              'input[placeholder="Search Open Food Facts..."]'
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
                                    imageUrl: (product.image_front_small_url ||
                                      '') as string,
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
                                }}
                              >
                                <div className="text-left">
                                  <div className="font-medium">
                                    {product.product_name || 'Unknown Product'}
                                  </div>
                                  {product.brands && (
                                    <div className="text-gray-500">
                                      {product.brands}
                                    </div>
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
