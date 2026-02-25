'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useProductWithBatches } from '@/hooks/use-products'
import { BatchList } from './product-detail-modal/batch-list'
import { UntrackedAlert } from './product-detail-modal/untracked-alert'
import { ExpiryAutomationSection } from './product-detail-modal/expiry-automation-section'

interface ProductDetailPanelProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  focusAddDate?: boolean
}

export function ProductDetailPanel({
  isOpen,
  onClose,
  productId,
  focusAddDate = false,
}: ProductDetailPanelProps) {
  const { data, isLoading } = useProductWithBatches(productId)
  const product = data?.product
  const batches = data?.batches

  const isReady = !isLoading && !!data

  const [editingBatchId, setEditingBatchId] = useState<string | null>(null)

  const handleClose = () => {
    setEditingBatchId(null)
    onClose()
  }

  const totalTrackedQty =
    batches
      ?.filter(b => b.status === 'active')
      .reduce((sum, b) => sum + (b.current_quantity || 0), 0) || 0

  const untrackedQty = Math.max(0, (product?.store_quantity || 0) - totalTrackedQty)

  const sortedBatches = [...(batches || [])].sort((a, b) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const aNoDate = !a.expiry_date || a.status === 'draft'
    const bNoDate = !b.expiry_date || b.status === 'draft'

    if (aNoDate && bNoDate) return 0

    if (aNoDate || bNoDate) {
      const dateToCheck = aNoDate ? b.expiry_date : a.expiry_date
      if (dateToCheck) {
        const expiry = new Date(dateToCheck)
        expiry.setHours(0, 0, 0, 0)
        const isExpired = expiry < today
        if (isExpired) return aNoDate ? -1 : 1
        return aNoDate ? 1 : -1
      }
      return 0
    }

    const aExpiry = new Date(a.expiry_date || '')
    const bExpiry = new Date(b.expiry_date || '')
    aExpiry.setHours(0, 0, 0, 0)
    bExpiry.setHours(0, 0, 0, 0)

    const aExpired = aExpiry < today
    const bExpired = bExpiry < today

    if (aExpired && !bExpired) return 1
    if (!aExpired && bExpired) return -1

    if (aExpired && bExpired) return bExpiry.getTime() - aExpiry.getTime()
    return aExpiry.getTime() - bExpiry.getTime()
  })

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && handleClose()}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 w-full sm:max-w-[500px]">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle className="text-xl font-bold">
            {product?.name || 'Product Details'}
          </SheetTitle>
          {product?.brand || product?.category_display_name ? (
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
          ) : null}
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          {!isReady ? (
            <>
              <Skeleton className="h-24 w-full rounded-3xl" />
              <Skeleton className="h-32 w-full rounded-3xl" />
              <Skeleton className="h-12 w-full rounded-3xl" />
            </>
          ) : (
            <>
              {untrackedQty > 0 && (
                <UntrackedAlert
                  count={untrackedQty}
                  productId={productId}
                  autoExpand={focusAddDate}
                  costPrice={product?.store_cost_price}
                  sellingPrice={product?.store_selling_price}
                />
              )}

              {/* Stock overview */}
              {/* <div className="flex flex-col gap-2">
                <Typography variant="h5" className="font-semibold">
                  Stock
                </Typography>
                <div className="flex items-center justify-between">
                  <Typography variant="p" color="muted">
                    Total stock
                  </Typography>
                  <Typography variant="p" color="muted">
                    {product?.store_quantity ?? product?.batch_quantity ?? 0}
                  </Typography>
                </div>
                <div className="flex items-center justify-between">
                  <Typography variant="p" color="muted">
                    Tracked with expiry dates
                  </Typography>
                  <Typography variant="p" color="muted">
                    {totalTrackedQty} of {product?.store_quantity ?? product?.batch_quantity ?? 0}
                  </Typography>
                </div>
              </div> */}

              {/* Batch list */}
              <div className="select-none">
                <BatchList
                  batches={sortedBatches}
                  storeQuantity={product?.store_quantity ?? null}
                  editingBatchId={editingBatchId}
                  onStartEdit={(batchId: string) => setEditingBatchId(batchId)}
                  onCancelEdit={() => setEditingBatchId(null)}
                />
              </div>

              <ExpiryAutomationSection
                productId={productId}
                productName={product?.name || ''}
                categoryId={product?.category_id || ''}
                categoryName={product?.category_display_name || 'Unknown'}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-center">
          <Typography variant="p" color="muted">
            {totalTrackedQty} of {product?.store_quantity ?? product?.batch_quantity ?? 0} units
            tracked with expiry dates
          </Typography>
        </div>
      </SheetContent>
    </Sheet>
  )
}
