'use client'

import { useCallback, useEffect, useState } from 'react'
import { addDays, format } from 'date-fns'
import { Calendar, ChevronLeft, Package, XCircle } from 'lucide-react'
import Image from 'next/image'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BatchSuccessCard,
  DraftBatchCard,
  ExpiryPresetButtons,
  QuantitySelector,
} from '@/components/batch-creation'
import {
  useActivateDraftBatch,
  useIgnoreDraftBatch,
  useDraftBatchesByProduct,
  type ActivateDraftBatchResult,
  type ProductWithDraftBatches,
} from '@/hooks/use-draft-batches'
import { cn } from '@/lib/utils'
import { parseISODateAsLocal } from '@/lib/utils/date-conversion'
import { Typography } from '@/components/ui/typography'

type Step = 'product-selection' | 'expiry-entry' | 'success'

interface BatchCreationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  products?: ProductWithDraftBatches[]
  singleProduct?: ProductWithDraftBatches
  onComplete?: () => void
}

/**
 * Multi-step batch creation sheet for activating draft batches
 *
 * Features:
 * - Step 1: Product selection (if multiple products)
 * - Step 2: Expiry date entry with quantity selector
 * - Step 3: Success feedback with split batch handling
 * - Smooth animations between steps
 * - Loading and error states
 * - Mobile-optimized UI
 *
 * @example
 * ```tsx
 * const { data: products } = useDraftBatchesByProduct()
 *
 * <BatchCreationSheet
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   storeId={storeId}
 *   products={products}
 *   onComplete={() => console.log('All batches processed')}
 * />
 * ```
 */
export function BatchCreationSheet({
  open,
  onOpenChange,
  storeId,
  products: externalProducts,
  singleProduct,
  onComplete,
}: BatchCreationSheetProps) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [currentStep, setCurrentStep] = useState<Step>('product-selection')
  const [selectedProductIndex, setSelectedProductIndex] = useState<number>(0)
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1)
  const [selectedDays, setSelectedDays] = useState<number | null>(null)
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [activationResult, setActivationResult] = useState<ActivateDraftBatchResult | null>(null)

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Fetch products if not provided externally
  const {
    data: fetchedProducts,
    isLoading,
    error: fetchError,
  } = useDraftBatchesByProduct({}, externalProducts || singleProduct ? undefined : storeId)

  // Determine which products to use
  const products = externalProducts || fetchedProducts || []
  const effectiveProducts = singleProduct ? [singleProduct] : products
  const currentProduct = effectiveProducts[selectedProductIndex]

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const { mutateAsync: activateBatch, isPending: isActivating } = useActivateDraftBatch()
  const { mutateAsync: ignoreBatch, isPending: isIgnoring } = useIgnoreDraftBatch()

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const resetExpiryForm = useCallback(() => {
    if (currentProduct) {
      // Use first batch's quantity, not total across all batches
      const firstBatchQuantity = currentProduct.draft_batches[0]?.quantity ?? 1
      setSelectedQuantity(firstBatchQuantity)
      setSelectedDays(currentProduct.last_expiry_days)
    }
    setCustomDate(undefined)
    setShowDatePicker(false)
  }, [currentProduct])

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Reset state when sheet opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep(singleProduct ? 'expiry-entry' : 'product-selection')
      setSelectedProductIndex(0)
      setActivationResult(null)
      resetExpiryForm()
    }
  }, [open, singleProduct, resetExpiryForm])

  // Reset expiry form when product changes
  useEffect(() => {
    resetExpiryForm()
  }, [resetExpiryForm])

  const handleProductSelect = (index: number) => {
    setSelectedProductIndex(index)
    setCurrentStep('expiry-entry')
  }

  const handleBackToProducts = () => {
    setCurrentStep('product-selection')
    resetExpiryForm()
    setActivationResult(null)
  }

  const handleActivateBatch = async () => {
    if (!currentProduct) return

    // Determine expiry date
    let expiryDate: string
    if (customDate) {
      expiryDate = format(customDate, 'yyyy-MM-dd')
    } else if (selectedDays !== null) {
      const date = addDays(new Date(), selectedDays)
      expiryDate = format(date, 'yyyy-MM-dd')
    } else {
      return // Should not happen due to button disabled state
    }

    // Get the first draft batch for this product
    const batchId = currentProduct.draft_batches[0]?.batch_id
    if (!batchId) {
      console.error('No draft batch ID found')
      return
    }

    try {
      const result = await activateBatch({
        batchId,
        expiryDate,
        quantity: selectedQuantity,
      })

      // Only transition to success step if actually successful
      if (result.success) {
        setActivationResult(result)
        setCurrentStep('success')
      }
      // Error case is already handled by the mutation's onSuccess callback with toast
    } catch (error) {
      console.error('Failed to activate batch:', error)
      // Error toast is already shown by the mutation hook
    }
  }

  const handleIgnoreBatch = async () => {
    if (!currentProduct) return

    // Get the first draft batch for this product
    const batchId = currentProduct.draft_batches[0]?.batch_id
    if (!batchId) {
      console.error('No draft batch ID found')
      return
    }

    try {
      const result = await ignoreBatch({
        batchId,
        quantity: currentProduct.draft_batches[0]?.quantity,
      })

      if (result.success) {
        // Move to next product or close
        handleContinueOrSkip()
      }
    } catch (error) {
      console.error('Failed to ignore batch:', error)
      // Error toast is already shown by the mutation hook
    }
  }

  const handleAddAnother = () => {
    setActivationResult(null)
    setCurrentStep('expiry-entry')
    resetExpiryForm()
  }

  const handleContinueOrSkip = () => {
    setActivationResult(null)

    // Move to next product
    const nextIndex = selectedProductIndex + 1
    if (nextIndex < effectiveProducts.length) {
      setSelectedProductIndex(nextIndex)
      setCurrentStep(singleProduct ? 'expiry-entry' : 'product-selection')
      resetExpiryForm()
    } else {
      // All products processed
      onComplete?.()
      onOpenChange(false)
    }
  }

  const handleSkipProduct = () => {
    handleContinueOrSkip()
  }

  const handleDateSelect = (date: Date | undefined) => {
    setCustomDate(date)
    if (date) {
      // Calculate days from today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const selectedDate = new Date(date)
      selectedDate.setHours(0, 0, 0, 0)
      const diffTime = selectedDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      setSelectedDays(diffDays)
      setShowDatePicker(false)
    }
  }

  const handleDone = () => {
    onComplete?.()
    onOpenChange(false)
  }

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const isDateSelected = selectedDays !== null || customDate !== undefined
  const hasMultipleProducts = effectiveProducts.length > 1
  const currentProductNumber = selectedProductIndex + 1
  const totalProducts = effectiveProducts.length

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn('w-full sm:max-w-lg', 'p-0 flex flex-col', 'overflow-hidden')}
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            {currentStep === 'expiry-entry' && !singleProduct && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToProducts}
                className="shrink-0 h-9 w-9"
                aria-label="Back to product list"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}

            <div className="flex-1 min-w-0">
              <SheetTitle>
                {currentStep === 'product-selection' && 'Add Expiry Dates'}
                {currentStep === 'expiry-entry' && 'Set Expiry Date'}
                {currentStep === 'success' && 'Batch Added'}
              </SheetTitle>
              <SheetDescription>
                {currentStep === 'product-selection' &&
                  `${totalProducts} product${totalProducts !== 1 ? 's' : ''} with draft batches`}
                {currentStep === 'expiry-entry' &&
                  (hasMultipleProducts
                    ? `Product ${currentProductNumber} of ${totalProducts}`
                    : 'Choose quantity and expiry date')}
                {currentStep === 'success' && 'Successfully activated batch'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading State */}
          {isLoading && !externalProducts && !singleProduct && (
            <div className="p-6 space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {/* Error State */}
          {fetchError && (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertDescription>Failed to load draft batches. Please try again.</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 1: Product Selection */}
          {currentStep === 'product-selection' && !isLoading && !fetchError && (
            <div
              className={cn(
                'p-6 space-y-4',
                'animate-in fade-in-0 slide-in-from-right-4 duration-300',
              )}
            >
              {effectiveProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No draft batches found</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    All batches have expiry dates assigned
                  </p>
                </div>
              ) : (
                effectiveProducts.map((product, index) => (
                  <DraftBatchCard
                    key={product.product_id}
                    product={product}
                    onClick={() => handleProductSelect(index)}
                  />
                ))
              )}
            </div>
          )}

          {/* Step 2: Expiry Entry */}
          {currentStep === 'expiry-entry' && currentProduct && (
            <div
              className={cn(
                'p-6 space-y-6',
                'animate-in fade-in-0 slide-in-from-right-4 duration-300',
              )}
            >
              {/* Product Header */}
              <div className="flex gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                <div className="shrink-0">
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {currentProduct.product_name ? (
                      <Image
                        src={`https://placehold.co/200x200/e5e7eb/6b7280?text=${encodeURIComponent(
                          currentProduct.product_name.substring(0, 2),
                        )}`}
                        alt={currentProduct.product_name}
                        fill
                        className="object-cover"
                        sizes="64px"
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate">
                    {currentProduct.product_name}
                  </h3>
                  {currentProduct.product_brand && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {currentProduct.product_brand}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {currentProduct.total_draft_quantity} units in{' '}
                    {currentProduct.draft_batch_count} batch
                    {currentProduct.draft_batch_count !== 1 ? 'es' : ''}
                  </p>
                </div>
              </div>

              {/* Category Hint */}
              {currentProduct.category_name && currentProduct.typical_shelf_life_days && (
                <div className="p-3 rounded-lg bg-secondary-50 dark:bg-secondary-900/20 flex justify-center items-center gap-1">
                  <Calendar className="h-3 w-3 text-secondary" />
                  <Typography variant="small" color="secondary">
                    {currentProduct.category_name} typically expires in +
                    {currentProduct.typical_shelf_life_days} days
                  </Typography>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="quantity-selector">Select Quantity</Label>
                <QuantitySelector
                  value={selectedQuantity}
                  onChange={setSelectedQuantity}
                  min={1}
                  max={
                    currentProduct.draft_batches[0]?.quantity ?? currentProduct.total_draft_quantity
                  }
                />
                {selectedQuantity < (currentProduct.draft_batches[0]?.quantity ?? 0) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Batch will be split.{' '}
                    {(currentProduct.draft_batches[0]?.quantity ?? 0) - selectedQuantity} units will
                    remain in draft.
                  </p>
                )}
              </div>

              {/* Expiry Preset Buttons */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="expiry-preset-buttons">Choose Expiry Date</Label>
                <ExpiryPresetButtons
                  onSelect={days => {
                    setSelectedDays(days)
                    setCustomDate(undefined)
                  }}
                  onPickDate={() => setShowDatePicker(!showDatePicker)}
                  selectedDays={selectedDays}
                  suggestedDays={currentProduct.last_expiry_days}
                />
              </div>

              {/* Custom Date Picker */}
              {showDatePicker && (
                <div
                  className={cn(
                    'flex flex-col gap-2',
                    'animate-in fade-in-0 slide-in-from-top-2 duration-200',
                  )}
                >
                  <Label htmlFor="custom-expiry-date">Custom Expiry Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-600 dark:text-primary-400" />
                    <Input
                      id="custom-expiry-date"
                      type="date"
                      value={customDate ? format(customDate, 'yyyy-MM-dd') : ''}
                      onChange={e => {
                        if (e.target.value) {
                          handleDateSelect(parseISODateAsLocal(e.target.value))
                        }
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="pl-11 h-12 text-base border-2 focus:border-primary-500 dark:focus:border-primary-400 rounded-lg"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  {customDate && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ Custom date selected
                    </p>
                  )}
                </div>
              )}

              {/* Add Batch Button */}
              <Button
                size="lg"
                className="w-full min-h-[44px] font-semibold"
                disabled={!isDateSelected || isActivating || isIgnoring}
                onClick={handleActivateBatch}
              >
                {isActivating ? 'Adding Batch...' : `Add Batch (${selectedQuantity} units)`}
              </Button>

              {/* Ignore Button */}
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleIgnoreBatch}
                disabled={isActivating || isIgnoring}
                className={cn(
                  'w-full min-h-[44px]',
                  'text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                )}
              >
                <XCircle className="h-4 w-4 mr-2" />
                {isIgnoring ? 'Ignoring...' : 'Ignore This Batch'}
              </Button>
            </div>
          )}

          {/* Step 3: Success */}
          {currentStep === 'success' && activationResult && (
            <div className={cn('p-6', 'animate-in fade-in-0 slide-in-from-right-4 duration-300')}>
              <BatchSuccessCard
                result={activationResult}
                onAddAnother={activationResult.was_split ? handleAddAnother : undefined}
                onSkip={handleContinueOrSkip}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {currentStep === 'product-selection' && effectiveProducts.length > 0 && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-800">
            <Button
              size="lg"
              variant="outline"
              className="w-full min-h-[44px] font-medium"
              onClick={handleDone}
            >
              Done
            </Button>
          </div>
        )}

        {currentStep === 'expiry-entry' && !singleProduct && hasMultipleProducts && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-800">
            <Button
              size="lg"
              variant="ghost"
              className="w-full min-h-[44px] font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={handleSkipProduct}
            >
              Skip This Product
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
