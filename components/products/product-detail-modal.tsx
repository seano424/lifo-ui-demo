'use client'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Typography } from '@/components/ui/typography'
import { useBatchesForProduct } from '@/hooks/use-batches'
import { useProduct } from '@/hooks/use-products'
import { BatchList } from './product-detail-modal/batch-list'
import { UntrackedAlert } from './product-detail-modal/untracked-alert'
import { TrackingSettings } from './product-detail-modal/tracking-settings'
import { useState, useEffect } from 'react'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface ProductDetailModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  highlightBatchId?: string | null
  focusAddDate?: boolean
}

export function ProductDetailModal({
  isOpen,
  onClose,
  productId,
  highlightBatchId = null,
  focusAddDate = false,
}: ProductDetailModalProps) {
  const activeStoreId = useActiveStoreId()
  const { data: product } = useProduct(productId)
  const { data: batches, isLoading: isLoadingBatches } = useBatchesForProduct(productId, {
    storeId: activeStoreId || undefined,
  })

  const [highlightedBatchId, setHighlightedBatchId] = useState<string | null>(highlightBatchId)
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null)

  // Clear highlight after 3 seconds
  useEffect(() => {
    if (highlightedBatchId) {
      const timeout = setTimeout(() => setHighlightedBatchId(null), 3000)
      return () => clearTimeout(timeout)
    }
  }, [highlightedBatchId])

  // Calculate untracked quantity
  // NOTE: This calculation is blocked on store_products.quantity migration
  // For Phase 1, hardcoded to 0 until migration lands
  const totalTrackedQty =
    batches
      ?.filter(b => b.status === 'active')
      .reduce((sum, b) => sum + (b.current_quantity || 0), 0) || 0

  // TODO: Replace with actual calculation once store_products.quantity exists:
  // const untrackedQty = (product?.square_quantity || 0) - totalTrackedQty
  const untrackedQty = 0 // Shell until migration lands

  // Sort batches by expiry date (soonest first)
  const sortedBatches = [...(batches || [])].sort((a, b) => {
    if (!a.expiry_date) return 1 // No date goes to end
    if (!b.expiry_date) return -1
    return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
  })

  return (
    <BottomSheet
      className="min-w-xl"
      isOpen={isOpen}
      onClose={onClose}
      titleElement={
        <div className="flex flex-col gap-2 py-4">
          <Typography variant="h3">{product?.name || 'Product Details'}</Typography>
          {product?.sku && (
            <Typography variant="small" className="text-muted-foreground font-mono">
              {product.sku}
            </Typography>
          )}
        </div>
      }
    >
      <div className="flex flex-col h-full max-h-[90vh]">
        <div className="flex-1 overflow-y-auto">
          {/* Product info section */}
          <div className="px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 flex-wrap">
              {product?.category_display_name && (
                <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  {product.category_display_name}
                </span>
              )}
              {product?.brand && (
                <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  {product.brand}
                </span>
              )}
              <div className="flex-1" />
              <Typography variant="h4" className="font-semibold">
                {product?.total_stock || 0}
              </Typography>
              <Typography variant="small" className="text-muted-foreground">
                total units
              </Typography>
            </div>
          </div>

          {/* Untracked alert */}
          {untrackedQty > 0 && (
            <UntrackedAlert count={untrackedQty} productId={productId} autoExpand={focusAddDate} />
          )}

          {/* Batch list */}
          <BatchList
            batches={sortedBatches}
            highlightedBatchId={highlightedBatchId}
            editingBatchId={editingBatchId}
            onStartEdit={setEditingBatchId}
            onCancelEdit={() => setEditingBatchId(null)}
            isLoading={isLoadingBatches}
          />

          {/* Tracking settings */}
          <TrackingSettings
            productId={productId}
            categoryId={product?.category_id || ''}
            shelfLifeDays={product?.effective_shelf_life || 14}
            shelfLifeSource={product?.shelf_life_source}
            categoryName={product?.category_display_name || 'Unknown'}
            initialTrackingMode={product?.tracking_mode || 'auto'}
          />
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-border/50 bg-muted/30 flex items-center justify-between">
          <Typography variant="small" className="text-muted-foreground">
            {totalTrackedQty} of {product?.total_stock || 0} units tracked
          </Typography>
        </div>
      </div>
    </BottomSheet>
  )
}
