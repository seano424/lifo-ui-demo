'use client'

import { useState, useMemo, useCallback } from 'react'
import { Package, Search, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RecentProductCard } from './recent-product-card'
import { DeliverySummary, type DeliveryItemWithName } from './delivery-summary'
import { BatchCreationSheet } from '@/components/batch-creation'
import {
  useRecentDeliveryProducts,
  useLogDelivery,
  useDraftBatchesByProduct,
  type RecentDeliveryProduct,
} from '@/hooks/use-draft-batches'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { cn } from '@/lib/utils'
import { Typography } from '../ui/typography'

interface DeliveryLogSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

/**
 * Quick-add delivery log sheet with recent products
 *
 * Features:
 * - Search input for finding products
 * - Recent/Frequent products section with quick-add buttons
 * - Running summary of items being added
 * - "Done with Delivery" creates draft batches
 * - Optional prompt to immediately add expiry dates
 *
 * Flow:
 * 1. User opens sheet
 * 2. Adds products via quick-add or custom quantity
 * 3. Reviews summary
 * 4. Clicks "Done with Delivery" → creates draft batches
 * 5. Optionally opens BatchCreationSheet for expiry dates
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false)
 *
 * <DeliveryLogSheet
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onComplete={() => console.log('Delivery logged!')}
 * />
 * ```
 */
export function DeliveryLogSheet({ open, onOpenChange, onComplete }: DeliveryLogSheetProps) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [searchQuery, setSearchQuery] = useState('')
  const [deliveryItems, setDeliveryItems] = useState<Map<string, DeliveryItemWithName>>(new Map())
  const [showBatchCreation, setShowBatchCreation] = useState(false)

  // ============================================================================
  // HOOKS
  // ============================================================================

  const storeId = useActiveStoreId()
  const { data: recentProducts, isLoading: isLoadingRecent } = useRecentDeliveryProducts(
    20,
    storeId || undefined,
  )
  const { mutateAsync: logDelivery, isPending: isLoggingDelivery } = useLogDelivery()
  const { data: draftProducts } = useDraftBatchesByProduct({}, storeId || undefined)

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Filter recent products by search query
  const filteredRecentProducts = useMemo(() => {
    if (!recentProducts) return []
    if (!searchQuery.trim()) return recentProducts

    const query = searchQuery.toLowerCase()
    return recentProducts.filter(product => product.product_name.toLowerCase().includes(query))
  }, [recentProducts, searchQuery])

  // Convert Map to array for summary component
  const deliveryItemsArray = useMemo(() => Array.from(deliveryItems.values()), [deliveryItems])

  // Check if product is already added
  const isProductAdded = useCallback(
    (productId: string) => deliveryItems.has(productId),
    [deliveryItems],
  )

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAddProduct = useCallback((product: RecentDeliveryProduct, quantity: number) => {
    setDeliveryItems(prev => {
      const newMap = new Map(prev)

      // If already added, update quantity
      if (newMap.has(product.product_id)) {
        const existing = newMap.get(product.product_id)!
        newMap.set(product.product_id, {
          ...existing,
          quantity: existing.quantity + quantity,
        })
      } else {
        // Add new item
        newMap.set(product.product_id, {
          product_id: product.product_id,
          product_name: product.product_name,
          quantity,
        })
      }

      return newMap
    })
  }, [])

  const handleRemoveItem = useCallback((productId: string) => {
    setDeliveryItems(prev => {
      const newMap = new Map(prev)
      newMap.delete(productId)
      return newMap
    })
  }, [])

  const handleClearAll = useCallback(() => {
    setDeliveryItems(new Map())
    setSearchQuery('')
  }, [])

  const handleSubmitDelivery = useCallback(async () => {
    if (deliveryItemsArray.length === 0) return

    try {
      const items = deliveryItemsArray.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
      }))

      await logDelivery({ items })

      // Clear delivery items
      setDeliveryItems(new Map())
      setSearchQuery('')

      // Show prompt to add expiry dates
      const shouldAddExpiry = window.confirm(
        `Delivery logged successfully!\n\n` +
          `${items.length} draft batch${items.length !== 1 ? 'es' : ''} created.\n\n` +
          `Would you like to add expiry dates now?`,
      )

      if (shouldAddExpiry) {
        // Close delivery sheet and open batch creation sheet
        onOpenChange(false)
        // Small delay to allow sheet animation to complete
        setTimeout(() => {
          setShowBatchCreation(true)
        }, 300)
      } else {
        // Just close the sheet
        onOpenChange(false)
        onComplete?.()
      }
    } catch (error) {
      console.error('Failed to log delivery:', error)
      // Error toast is already shown by the mutation hook
    }
  }, [deliveryItemsArray, logDelivery, onOpenChange, onComplete])

  const handleBatchCreationComplete = useCallback(() => {
    setShowBatchCreation(false)
    onComplete?.()
  }, [onComplete])

  // Reset state when sheet closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Clear state when closing
        setSearchQuery('')
        // Don't clear delivery items immediately to avoid jarring UX
        // They'll be cleared on next open or after successful submission
      }
      onOpenChange(newOpen)
    },
    [onOpenChange],
  )

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className={cn('w-full sm:max-w-lg', 'p-0 flex flex-col h-full', 'overflow-hidden')}
        >
          {/* Header - Fixed */}
          <SheetHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle>Quick Add Delivery</SheetTitle>
                <SheetDescription>Add products from recent deliveries</SheetDescription>
              </div>
              {deliveryItems.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Search Input - Fixed */}
          <div className="px-6 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-11 text-base"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Content Area - Scrollable */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 flex flex-col gap-6">
                {/* Recent Products Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Typography variant="h3">
                      {searchQuery ? 'Search Results' : 'Recent / Frequent'}
                    </Typography>
                    {!searchQuery && recentProducts && (
                      <Typography variant="small">{recentProducts.length} products</Typography>
                    )}
                  </div>

                  {/* Loading State */}
                  {isLoadingRecent && (
                    <div className="flex flex-col gap-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  )}

                  {/* Empty State */}
                  {!isLoadingRecent && filteredRecentProducts.length === 0 && (
                    <Alert>
                      <Package className="h-4 w-4" />
                      <AlertDescription>
                        {searchQuery
                          ? 'No products found matching your search'
                          : 'No recent deliveries found. Start by adding your first delivery.'}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Products List */}
                  {!isLoadingRecent && filteredRecentProducts.length > 0 && (
                    <div className="flex flex-col gap-4">
                      {filteredRecentProducts.map(product => (
                        <RecentProductCard
                          key={product.product_id}
                          product={product}
                          onQuickAdd={qty => handleAddProduct(product, qty)}
                          onCustomAdd={qty => handleAddProduct(product, qty)}
                          isAdded={isProductAdded(product.product_id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Separator */}
                {deliveryItems.size > 0 && <Separator className="my-6" />}

                {/* Delivery Summary */}
                {deliveryItems.size > 0 && (
                  <DeliverySummary
                    items={deliveryItemsArray}
                    onRemoveItem={handleRemoveItem}
                    onSubmit={handleSubmitDelivery}
                    isSubmitting={isLoggingDelivery}
                  />
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Footer - Always visible summary - Fixed */}
          {deliveryItems.size > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-background shrink-0">
              <div className="flex items-center justify-between text-sm">
                <Typography variant="small">
                  {deliveryItems.size} product{deliveryItems.size !== 1 ? 's' : ''} •{' '}
                  {deliveryItemsArray.reduce((sum, item) => sum + item.quantity, 0)} units
                </Typography>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    // Scroll to summary
                    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]')
                    scrollArea?.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' })
                  }}
                  className="text-primary-800 dark:text-primary-400"
                >
                  View Summary
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Batch Creation Sheet - Opens after delivery logged */}
      <BatchCreationSheet
        open={showBatchCreation}
        onOpenChange={setShowBatchCreation}
        storeId={storeId || ''}
        products={draftProducts}
        onComplete={handleBatchCreationComplete}
      />
    </>
  )
}
