'use client'

import { AlertCircle, ArrowRight, Check, Keyboard, Loader2, Package, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import React, { useCallback, useEffect, useRef, useState } from 'react'

// Constants
const SEARCH_CONFIG = {
  DEBOUNCE_DELAY: 300,
  MIN_BARCODE_LENGTH: 8,
  MIN_SEARCH_LENGTH: 2,
  MAX_SEARCH_RESULTS: 5,
} as const

// Safe category parser utility
const parseFirstCategory = (categories: unknown): string => {
  if (!categories) return 'Unknown'

  try {
    const categoryStr = String(categories)
    if (!categoryStr || categoryStr === 'undefined' || categoryStr === 'null') return 'Unknown'

    const firstCategory = categoryStr.split(',')[0]?.trim()
    return firstCategory || 'Unknown'
  } catch {
    return 'Unknown'
  }
}

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
import type { OpenFoodFactsSearchResult, ProductLookupResult } from '@/lib/queries/open-food-facts'
import { useScanningActions, useScannedProduct } from '@/lib/stores/scanning-workflow-store'
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
  mode?: 'deliveries' | 'scan-out' // Determines which API to use
  storeId?: string // Required for scan-out mode to filter products by store
  defaultBarcode?: string // For scan-out manual entry
}

export default function ManualBarcodeEntry({
  onProductSelected,
  className = '',
  mode = 'deliveries', // Default to deliveries for backward compatibility
  storeId,
  defaultBarcode = '',
}: ManualBarcodeEntryProps) {
  const t = useTranslations('products.manualEntry')
  const tButtons = useTranslations('buttons')
  const tFields = useTranslations('products.fields')
  const tPlaceholders = useTranslations('products.placeholders')

  const { getCategoriesForDropdown, isLoading: categoriesLoading } = useCategories()

  // 🎯 Read from Zustand store for pre-filling
  const scannedProduct = useScannedProduct()
  const { setProductSelected } = useScanningActions()
  const { activeStore } = useStoreState()

  const [barcode, setBarcode] = useState(defaultBarcode || scannedProduct?.barcode || '')
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null)
  const [manualProductData, setManualProductData] = useState({
    productName: scannedProduct?.productName || '',
    brand: scannedProduct?.brand || '',
    category: scannedProduct?.category || '',
    imageUrl: scannedProduct?.imageUrl || '',
  })
  const [shouldLookup, setShouldLookup] = useState(false)

  // Update form state when scannedProduct from store changes (for pre-fill/editing)
  useEffect(() => {
    if (scannedProduct) {
      setBarcode(scannedProduct.barcode)
      setManualProductData({
        productName: scannedProduct.productName || '',
        brand: scannedProduct.brand || '',
        category: scannedProduct.category || '',
        imageUrl: scannedProduct.imageUrl || '',
      })
    }
  }, [scannedProduct])

  const {
    data: lookupResult,
    isLoading: isLookingUp,
    error: lookupError,
  } = useProductLookup(barcode, shouldLookup && barcode.length >= 8)

  const productSearch = useProductSearch() // OpenFoodFacts search
  const supabaseSearch = useSupabaseProductSearch(storeId) // Supabase search
  const [productNameQuery, setProductNameQuery] = useState('')
  const [showProductSearchResults, setShowProductSearchResults] = useState(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Use the appropriate search based on mode
  const activeSearch = mode === 'scan-out' ? supabaseSearch : productSearch

  const [barcodeStockStatus, setBarcodeStockStatus] = useState<{
    hasStock: boolean
    availableQuantity: number
  } | null>(null)

  // Input validation helper
  const isValidBarcode = (code: string): boolean => {
    return /^\d{8,}$/.test(code)
  }

  const handleBarcodeSubmit = async () => {
    if (!barcode || barcode.length < SEARCH_CONFIG.MIN_BARCODE_LENGTH || !isValidBarcode(barcode)) {
      return
    }
    setBarcodeStockStatus(null) // Reset stock status
    setShouldLookup(true) // Trigger the lookup
  }

  // Check stock status when lookup result changes in scan-out mode
  const checkStockStatus = useCallback(
    async (barcode: string) => {
      if (mode !== 'scan-out' || !storeId || !activeStore) {
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

        const totalStock = batches?.reduce((sum, batch) => sum + batch.current_quantity, 0) || 0
        setBarcodeStockStatus({
          hasStock: totalStock > 0,
          availableQuantity: totalStock,
        })
      } catch (error) {
        console.error('Error checking stock status:', error)
      }
    },
    [mode, storeId, activeStore],
  )

  // Check stock when lookup result changes
  React.useEffect(() => {
    if (lookupResult?.found && lookupResult.product && mode === 'scan-out') {
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
      if (query.length < SEARCH_CONFIG.MIN_SEARCH_LENGTH) {
        setShowProductSearchResults(false)
        return
      }

      try {
        if (mode === 'scan-out') {
          if (!storeId) {
            console.error('Store ID is required for scan-out product search')
            return
          }
          await supabaseSearch.mutateAsync(query)
        } else {
          // For deliveries mode, search both Supabase and Open Food Facts with better error handling
          const [supabaseResult, offResult] = await Promise.allSettled([
            supabaseSearch.mutateAsync(query),
            productSearch.mutateAsync(query),
          ])

          // Log any individual failures but don't fail the entire search
          if (supabaseResult.status === 'rejected') {
            console.error('Supabase search failed:', supabaseResult.reason)
          }
          if (offResult.status === 'rejected') {
            console.error('Open Food Facts search failed:', offResult.reason)
          }
        }
        setShowProductSearchResults(true)
      } catch (error) {
        console.error('Product search error:', error)
        setShowProductSearchResults(false)
      }
    },
    [mode, storeId, supabaseSearch, productSearch],
  )

  const handleProductNameSearch = useCallback(
    (query: string) => {
      // Clear previous timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
        debounceTimeoutRef.current = null
      }

      // If query is too short, hide results immediately
      if (query.length < SEARCH_CONFIG.MIN_SEARCH_LENGTH) {
        setShowProductSearchResults(false)
        return
      }

      // Set new timeout for debounced search
      debounceTimeoutRef.current = setTimeout(() => {
        debouncedProductNameSearch(query)
        debounceTimeoutRef.current = null
      }, SEARCH_CONFIG.DEBOUNCE_DELAY)
    },
    [debouncedProductNameSearch],
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
  }

  return (
    <div className={`flex flex-col gap-4 max-w-2xl mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              {mode === 'scan-out' ? t('manualSearch') : t('title')}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {selectedProduct && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <Typography variant="h3">{t('productSelected')}</Typography>
                    <div className="text-sm mt-1 flex flex-col gap-1">
                      <div>
                        <strong>{tFields('name')}:</strong> {selectedProduct.productName}
                      </div>
                      {selectedProduct.brand && (
                        <div>
                          <strong>{tFields('brand')}:</strong> {selectedProduct.brand}
                        </div>
                      )}
                      {selectedProduct.category && (
                        <div>
                          <strong>{tFields('category')}:</strong> {selectedProduct.category}
                        </div>
                      )}
                      <div>
                        <strong>{tFields('barcode')}:</strong>{' '}
                        <code className="text-xs">{selectedProduct.barcode}</code>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={handleConfirmAndProceed}
                    className="flex-1 bg-primary-600 hover:bg-primary-700"
                  >
                    {tButtons('selectProduct')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                    {tButtons('change')}
                  </Button>
                </div>
                <Alert className="mt-3">
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs">
                    {t('autoProceedException')}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {!selectedProduct && (
            <>
              <div className="flex flex-col gap-4">
                {/* Barcode Lookup */}
                <div className="flex flex-col gap-2">
                  <Label>{t('searchByBarcode')}</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="text"
                      value={barcode}
                      onChange={e => {
                        setBarcode(e.target.value)
                        setShouldLookup(false) // Reset lookup trigger when user types
                      }}
                      onKeyDown={e => {
                        if (
                          e.key === 'Enter' &&
                          barcode.length >= SEARCH_CONFIG.MIN_BARCODE_LENGTH &&
                          isValidBarcode(barcode)
                        ) {
                          handleBarcodeSubmit()
                        }
                      }}
                      placeholder={t('barcodePlaceholder')}
                      className="font-mono"
                      disabled={isLookingUp}
                    />

                    <Button
                      onClick={handleBarcodeSubmit}
                      disabled={
                        barcode.length < SEARCH_CONFIG.MIN_BARCODE_LENGTH ||
                        !isValidBarcode(barcode) ||
                        isLookingUp
                      }
                      className="shrink-0"
                    >
                      {isLookingUp ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      {tButtons('lookup')}
                    </Button>
                  </div>
                  {barcode &&
                    (barcode.length < SEARCH_CONFIG.MIN_BARCODE_LENGTH ||
                      !isValidBarcode(barcode)) && (
                      <p className="text-xs text-orange-600">{t('barcodeValidation')}</p>
                    )}
                </div>

                {/* Product Name Search */}
                <div className="flex flex-col gap-2">
                  <Label>
                    {t('searchByProductName')}
                    {mode === 'scan-out' && (
                      <span className="text-xs text-foreground ml-2">{t('inStockItemsOnly')}</span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={productNameQuery}
                      onChange={e => {
                        setProductNameQuery(e.target.value)
                        handleProductNameSearch(e.target.value)
                      }}
                      placeholder={
                        mode === 'scan-out'
                          ? t('inventorySearchPlaceholder')
                          : t('searchPlaceholder')
                      }
                      disabled={false}
                    />
                    {activeSearch.isPending && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {showProductSearchResults &&
                    ((mode === 'scan-out' && activeSearch.data && activeSearch.data.length > 0) ||
                      (mode === 'deliveries' &&
                        ((supabaseSearch.data && supabaseSearch.data.length > 0) ||
                          (productSearch.data && productSearch.data.length > 0)))) && (
                      <div className="border rounded-2xl max-h-64 overflow-y-auto bg-white shadow-lg p-2">
                        {mode === 'scan-out' ? (
                          // Supabase results for scan-out
                          (activeSearch.data as SupabaseProductSearchResult[]).map(product => (
                            <Button
                              key={product.product_id}
                              variant="subtleGray"
                              className={`w-full rounded-none justify-start text-left p-3 ${
                                product.isOutOfStock && '!cursor-not-allowed'
                              }`}
                              disabled={product.isOutOfStock}
                              onClick={() => {
                                if (product.isOutOfStock) return

                                // For scan-out/Supabase results, use the product_id if no barcode exists
                                // This ensures we have a unique identifier that won't cause lookup failures
                                const effectiveBarcode =
                                  product.barcode && product.barcode.trim() !== ''
                                    ? product.barcode
                                    : `INTERNAL-${product.product_id}`

                                const productData = {
                                  barcode: effectiveBarcode,
                                  productName: product.name,
                                  brand: product.brand || '',
                                  category: product.category || '',
                                  imageUrl: product.image_url || '',
                                  isManualEntry: true,
                                  // Store the actual product_id for scan-out operations
                                  productId: product.product_id,
                                }

                                setProductSelected(productData)
                                onProductSelected?.(effectiveBarcode, productData)

                                // Reset search
                                setProductNameQuery('')
                                setShowProductSearchResults(false)
                                setBarcode('')
                              }}
                            >
                              <div className="flex-1 flex flex-col gap-1">
                                <Typography variant="p">{product.name}</Typography>
                                {product.brand && (
                                  <Typography variant="p">{product.brand}</Typography>
                                )}
                                {product.isOutOfStock ? (
                                  <Typography variant="small" className="text-destructive">
                                    {t('outOfStock')}
                                  </Typography>
                                ) : product.total_available_quantity ? (
                                  <Typography variant="small" className="text-primary-800">
                                    {product.total_available_quantity} {t('unitsAvailable')}
                                    {product.batch_count &&
                                      product.batch_count > 1 &&
                                      ` (${product.batch_count} ${t('batchCount')})`}
                                  </Typography>
                                ) : null}
                              </div>
                            </Button>
                          ))
                        ) : (
                          // Combined results for deliveries mode
                          <>
                            {/* Supabase products first (higher priority) */}
                            {supabaseSearch.data &&
                              supabaseSearch.data.length > 0 &&
                              (supabaseSearch.data as SupabaseProductSearchResult[]).map(
                                product => (
                                  <Button
                                    key={`supabase-${product.product_id}`}
                                    variant="ghost"
                                    className="w-full justify-start text-left p-3"
                                    onClick={() => {
                                      const effectiveBarcode =
                                        product.barcode && product.barcode.trim() !== ''
                                          ? product.barcode
                                          : `INTERNAL-${product.product_id}`

                                      const productData = {
                                        barcode: effectiveBarcode,
                                        productName: product.name,
                                        brand: product.brand || '',
                                        category: product.category || '',
                                        imageUrl: product.image_url || '',
                                        isManualEntry: true,
                                        productId: product.product_id,
                                      }

                                      setProductSelected(productData)
                                      onProductSelected?.(effectiveBarcode, productData)

                                      // Reset search
                                      setProductNameQuery('')
                                      setShowProductSearchResults(false)
                                      setBarcode('')
                                    }}
                                  >
                                    <div className="flex-1">
                                      <div className="">{product.name}</div>
                                      {product.brand && (
                                        <div className="text-sm text-foreground">
                                          {product.brand}
                                        </div>
                                      )}
                                    </div>
                                  </Button>
                                ),
                              )}

                            {/* Open Food Facts results */}
                            {productSearch.data &&
                              productSearch.data.length > 0 &&
                              (productSearch.data as OpenFoodFactsSearchResult[]).map(product => (
                                <Button
                                  key={`off-${product.code}`}
                                  variant="ghost"
                                  className="w-full justify-start text-left p-3 hover:bg-gray-50"
                                  onClick={() => {
                                    const productData = {
                                      barcode: product.code,
                                      productName: product.product_name || 'Unknown Product',
                                      brand: product.brands || '',
                                      category: '',
                                      imageUrl: product.image_front_small_url || '',
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
                                    <div className="">
                                      {product.product_name || 'Unknown Product'}
                                    </div>
                                    {product.brands && (
                                      <div className="text-sm text-foreground">
                                        {product.brands}
                                      </div>
                                    )}
                                  </div>
                                </Button>
                              ))}
                          </>
                        )}
                      </div>
                    )}

                  {showProductSearchResults &&
                    ((mode === 'scan-out' && activeSearch.data && activeSearch.data.length === 0) ||
                      (mode === 'deliveries' &&
                        (!supabaseSearch.data || supabaseSearch.data.length === 0) &&
                        (!productSearch.data || productSearch.data.length === 0))) && (
                      <div className="text-sm text-foreground p-3 border rounded-2xl">
                        {t('noProductsFound')} "{productNameQuery}"
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
                <div className="flex flex-col gap-4">
                  {lookupResult.found ? (
                    <Card>
                      <CardContent className="p-4">
                        {/* Show different status based on stock availability in scan-out mode */}
                        {mode === 'scan-out' && barcodeStockStatus !== null ? (
                          barcodeStockStatus.hasStock ? (
                            <div className="flex justify-center items-center gap-2">
                              <Check className="w-6 h-6 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
                              <Typography variant="h3" className="text-primary-800 ">
                                {t('productFound')}
                              </Typography>
                            </div>
                          ) : (
                            <div className="flex justify-center items-center gap-2">
                              <AlertCircle className="w-6 h-6 text-destructive" />
                              <Typography variant="h3" className="text-destructive ">
                                {t('outOfStock')}
                              </Typography>
                            </div>
                          )
                        ) : (
                          <div className="flex justify-center items-center gap-2">
                            <Check className="w-6 h-6 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
                            <Typography variant="h3" className="text-primary-800 ">
                              {t('productFound')}
                            </Typography>
                          </div>
                        )}

                        {lookupResult.product && (
                          <div className="text-sm flex flex-col gap-2">
                            <div>
                              <strong>{tFields('name')}:</strong>{' '}
                              {lookupResult.product.product_name ||
                                lookupResult.product.product_name_en}
                            </div>
                            {lookupResult.product.brands && (
                              <div>
                                <strong>{tFields('brand')}:</strong> {lookupResult.product.brands}
                              </div>
                            )}
                            {lookupResult.product.categories && (
                              <div>
                                <strong>{tFields('category')}:</strong>{' '}
                                {parseFirstCategory(lookupResult.product.categories)}
                              </div>
                            )}

                            {/* Show stock information for scan-out mode */}
                            {mode === 'scan-out' && barcodeStockStatus !== null && (
                              <div>
                                <strong>Stock:</strong>{' '}
                                {barcodeStockStatus.hasStock ? (
                                  <span className="text-primary-800">
                                    {barcodeStockStatus.availableQuantity} {t('unitsAvailable')}
                                  </span>
                                ) : (
                                  <span className="text-destructive">{t('noStockAvailable')}</span>
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
                                productName: (lookupResult.product.product_name ||
                                  lookupResult.product.product_name_en ||
                                  'Unknown Product') as string,
                                brand: (lookupResult.product.brands || '') as string,
                                category:
                                  parseFirstCategory(lookupResult.product.categories) === 'Unknown'
                                    ? ''
                                    : parseFirstCategory(lookupResult.product.categories),
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
                            }
                          }}
                          className={`w-full mt-3 ${
                            mode === 'scan-out' &&
                            barcodeStockStatus !== null &&
                            !barcodeStockStatus.hasStock
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                          disabled={
                            !lookupResult.product ||
                            (mode === 'scan-out' &&
                              barcodeStockStatus !== null &&
                              !barcodeStockStatus.hasStock)
                          }
                        >
                          {mode === 'scan-out' &&
                          barcodeStockStatus !== null &&
                          !barcodeStockStatus.hasStock
                            ? t('outOfStockCannotSelect')
                            : t('selectThisProduct')}
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Alert variant="primary">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{t('productNotFound')}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {!lookupResult?.found && mode === 'deliveries' && (
                <div className="border-dashed border-2 p-4 rounded-2xl">
                  <div className="pb-3">
                    <div className="text-sm flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      {t('addProductManually')}
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label>{tFields('barcode')} *</Label>
                        <Input
                          value={barcode}
                          onChange={e => {
                            setBarcode(e.target.value)
                            setShouldLookup(false) // Reset lookup trigger when user types
                          }}
                          placeholder={tPlaceholders('barcode')}
                          className="font-mono"
                          required
                        />
                      </div>

                      <div>
                        <Label>{tFields('productName')} *</Label>
                        <Input
                          value={manualProductData.productName}
                          onChange={e =>
                            setManualProductData(prev => ({
                              ...prev,
                              productName: e.target.value,
                            }))
                          }
                          placeholder={tPlaceholders('productName')}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <Label>{tFields('brand')}</Label>
                          <Input
                            value={manualProductData.brand}
                            onChange={e =>
                              setManualProductData(prev => ({
                                ...prev,
                                brand: e.target.value,
                              }))
                            }
                            placeholder={tPlaceholders('brand')}
                          />
                        </div>

                        <div>
                          <Label>{tFields('category')}</Label>
                          <Select
                            value={manualProductData.category}
                            onValueChange={value =>
                              setManualProductData(prev => ({
                                ...prev,
                                category: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={tPlaceholders('selectCategory')} />
                            </SelectTrigger>
                            <SelectContent>
                              {categoriesLoading ? (
                                <div className="px-2 py-6 text-sm text-muted-foreground text-center">
                                  Loading categories...
                                </div>
                              ) : (
                                getCategoriesForDropdown().map(
                                  (category: { value: string; label: string; code: string }) => (
                                    <SelectItem key={category.value} value={category.value}>
                                      {category.label}
                                    </SelectItem>
                                  ),
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
                        <div className="mt-2 max-h-32 overflow-y-auto flex flex-col gap-1">
                          {productSearch.data
                            .slice(0, SEARCH_CONFIG.MAX_SEARCH_RESULTS)
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
                                }}
                              >
                                <div className="text-left">
                                  <div className="">
                                    {product.product_name || 'Unknown Product'}
                                  </div>
                                  {product.brands && (
                                    <div className="text-foreground">{product.brands}</div>
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
                      {t('selectThisProduct')}
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
