'use client'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Typography } from '@/components/ui/typography'
import { useBatchesForProduct } from '@/hooks/use-batches'
import { useProduct } from '@/hooks/use-products'
import { BatchList } from './product-detail-modal/batch-list'
import { UntrackedAlert } from './product-detail-modal/untracked-alert'
import { TrackingSettings } from './product-detail-modal/tracking-settings'
import { useState } from 'react'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { Badge } from '../ui/badge'

interface ProductDetailModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  focusAddDate?: boolean
}

export function ProductDetailModal({
  isOpen,
  onClose,
  productId,
  focusAddDate = false,
}: ProductDetailModalProps) {
  const activeStoreId = useActiveStoreId()
  const { data: product } = useProduct(productId)
  const { data: batches, isLoading: isLoadingBatches } = useBatchesForProduct(productId, {
    storeId: activeStoreId || undefined,
  })

  const [editingBatchId, setEditingBatchId] = useState<string | null>(null)

  // Clear editing state when modal closes
  const handleClose = () => {
    setEditingBatchId(null)
    onClose()
  }

  // Calculate untracked quantity
  const totalTrackedQty =
    batches
      ?.filter(b => b.status === 'active')
      .reduce((sum, b) => sum + (b.current_quantity || 0), 0) || 0

  const untrackedQty = Math.max(0, (product?.store_quantity || 0) - totalTrackedQty)

  // Sort batches: active first (soonest expiry), then no-date/draft, then expired (most recently expired first)
  const sortedBatches = [...(batches || [])].sort((a, b) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if batches are no-date or draft status
    const aNoDate = !a.expiry_date || a.status === 'draft'
    const bNoDate = !b.expiry_date || b.status === 'draft'

    // If both have no date/draft, maintain original order
    if (aNoDate && bNoDate) return 0

    // If only one has no date/draft, we need to check if the other is expired
    if (aNoDate || bNoDate) {
      const dateToCheck = aNoDate ? b.expiry_date : a.expiry_date
      if (dateToCheck) {
        const expiry = new Date(dateToCheck)
        expiry.setHours(0, 0, 0, 0)
        const isExpired = expiry < today

        if (isExpired) {
          // No-date comes before expired
          return aNoDate ? -1 : 1
        } else {
          // Active comes before no-date
          return aNoDate ? 1 : -1
        }
      }
      return 0
    }

    // Both have dates - check expiration
    const aExpiry = new Date(a.expiry_date || '')
    const bExpiry = new Date(b.expiry_date || '')
    aExpiry.setHours(0, 0, 0, 0)
    bExpiry.setHours(0, 0, 0, 0)

    const aExpired = aExpiry < today
    const bExpired = bExpiry < today

    // If one is expired and the other isn't, non-expired comes first
    if (aExpired && !bExpired) return 1
    if (!aExpired && bExpired) return -1

    // Both expired or both active: sort by expiry date
    if (aExpired && bExpired) {
      // Both expired: most recently expired first (descending)
      return bExpiry.getTime() - aExpiry.getTime()
    } else {
      // Both active: soonest expiry first (ascending)
      return aExpiry.getTime() - bExpiry.getTime()
    }
  })

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      className="lg:min-w-2xl"
      titleElement={
        <div className="flex flex-col gap-1 py-4">
          <Typography variant="h3" className="font-semibold">
            {product?.name || 'Product Details'}
          </Typography>
          <div className="flex items-center gap-2">
            {product?.brand && (
              <Typography variant="p" color="muted">
                {product.brand}
              </Typography>
            )}
            {product?.brand && product?.category_display_name && (
              <span className="text-sm text-muted-foreground">•</span>
            )}
            {product?.category_display_name && (
              <Typography variant="p" color="muted">
                {product.category_display_name}
              </Typography>
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col justify-between gap-4 h-full px-4 pb-4">
        <div className="flex flex-col gap-4">
          {untrackedQty > 0 && (
            <UntrackedAlert
              count={untrackedQty}
              productId={productId}
              autoExpand={focusAddDate}
              costPrice={product?.store_cost_price}
              sellingPrice={product?.store_selling_price}
            />
          )}

          {/* Section header */}
          <div className="flex flex-col gap-4 px-4 bg-muted rounded-3xl p-4">
            <div className="flex items-center gap-2 justify-between">
              <Typography variant="p">Total units</Typography>

              <Badge variant="secondaryRounded">
                {product?.store_quantity ?? product?.batch_quantity ?? 0}
              </Badge>
            </div>

            <div className="flex items-center gap-2 justify-between">
              <Typography variant="p">Tracked batches</Typography>
              <Badge variant="secondaryRounded">{batches?.length || 0} batches</Badge>
            </div>

            {/* <div className="flex items-center gap-2 justify-between">
              <Typography variant="p">Sorted by</Typography>
              <Badge variant="mutedRounded">Expiry date · Expired last</Badge>
            </div> */}
          </div>

          {/* Batch list */}
          <div className="select-none px-4 bg-muted rounded-3xl p-4">
            <BatchList
              batches={sortedBatches || []}
              batchQuantity={product?.batch_quantity || 0}
              storeQuantity={product?.store_quantity ?? null}
              editingBatchId={editingBatchId}
              onStartEdit={(batchId: string) => setEditingBatchId(batchId)}
              onCancelEdit={() => setEditingBatchId(null)}
              isLoading={isLoadingBatches}
            />
          </div>

          {/* Tracking settings */}
          <div className="px-4 bg-muted rounded-3xl p-4">
            <TrackingSettings
              productId={productId}
              categoryId={product?.category_id || ''}
              shelfLifeDays={product?.effective_shelf_life || 14}
              shelfLifeSource={product?.shelf_life_source}
              categoryName={product?.category_display_name || 'Unknown'}
              initialTrackingMode={product?.tracking_mode || 'auto'}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 flex items-center justify-center">
          <Typography variant="p" color="muted">
            {totalTrackedQty} of {product?.store_quantity ?? product?.batch_quantity ?? 0} units
            tracked with expiry dates
          </Typography>
        </div>
      </div>
    </BottomSheet>
  )
}
