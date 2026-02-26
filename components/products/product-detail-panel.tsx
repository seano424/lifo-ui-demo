'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useProductWithBatches } from '@/hooks/use-products'
import { BatchList } from './product-detail-panel/batch-list'
import { parseISODateAsLocal } from '@/lib/utils/date-conversion'
import { UntrackedAlert } from './product-detail-panel/untracked-alert'
import { ExpiryAutomationSection } from './product-detail-panel/expiry-automation-section'

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

  const storeQuantity = product?.store_quantity ?? 0
  const untrackedQty = Math.max(0, storeQuantity - totalTrackedQty)

  const sortedBatches = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return [...(batches || [])].sort((a, b) => {
      const aNoDate = !a.expiry_date || a.status === 'draft'
      const bNoDate = !b.expiry_date || b.status === 'draft'

      if (aNoDate && bNoDate) return 0

      if (aNoDate || bNoDate) {
        const dateToCheck = aNoDate ? b.expiry_date : a.expiry_date
        if (dateToCheck) {
          const expiry = parseISODateAsLocal(dateToCheck)
          expiry.setHours(0, 0, 0, 0)
          const isExpired = expiry < today
          if (isExpired) return aNoDate ? -1 : 1
          return aNoDate ? 1 : -1
        }
        return 0
      }

      const aExpiry = parseISODateAsLocal(a.expiry_date || '')
      const bExpiry = parseISODateAsLocal(b.expiry_date || '')
      aExpiry.setHours(0, 0, 0, 0)
      bExpiry.setHours(0, 0, 0, 0)

      const aExpired = aExpiry < today
      const bExpired = bExpiry < today

      if (aExpired && !bExpired) return 1
      if (!aExpired && bExpired) return -1

      if (aExpired && bExpired) return bExpiry.getTime() - aExpiry.getTime()
      return aExpiry.getTime() - bExpiry.getTime()
    })
  }, [batches])

  const productName = (product?.name || 'Product Details').replace(/ - /g, ' ')

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && handleClose()}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 w-full sm:max-w-[500px]">
        <SheetHeader className="px-6 py-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <ProductMonogram name={productName} imageUrl={product?.image_url} />
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-left flex items-center gap-3">
                <div>
                  <Typography variant="h3" className="font-black font-heading">
                    {productName}
                  </Typography>
                  {(product?.brand || product?.category_display_name) && (
                    <div className="hidden sm:flex flex-wrap items-center gap-1.5">
                      {product?.brand && (
                        <Typography variant="small" color="muted" className="font-light">
                          {product.brand}
                        </Typography>
                      )}
                      {product?.brand && product?.category_display_name && (
                        <span className="text-xs text-muted-foreground">·</span>
                      )}
                      {product?.category_display_name && (
                        <Typography variant="small" color="muted" className="font-light">
                          {product.category_display_name}
                        </Typography>
                      )}
                    </div>
                  )}
                </div>
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-border/20 pb-24 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {!isReady ? (
            <div className="px-6 py-6 flex flex-col gap-4">
              <Skeleton className="h-24 w-full rounded-3xl" />
              <Skeleton className="h-32 w-full rounded-3xl" />
              <Skeleton className="h-12 w-full rounded-3xl" />
            </div>
          ) : (
            <>
              {/* Batches section */}
              {sortedBatches.length > 0 && (
                <div className="">
                  <div className="select-none">
                    <BatchList
                      batches={sortedBatches}
                      storeQuantity={product?.store_quantity ?? null}
                      editingBatchId={editingBatchId}
                      onStartEdit={(batchId: string) => setEditingBatchId(batchId)}
                      onCancelEdit={() => setEditingBatchId(null)}
                    />
                  </div>
                </div>
              )}

              {/* COVERAGE section */}
              {untrackedQty > 0 && (
                <div className="px-6 py-5">
                  <Typography
                    variant="extraSmall"
                    color="muted"
                    className="uppercase italic tracking-wider mb-4"
                  >
                    Coverage
                  </Typography>
                  <UntrackedAlert
                    count={untrackedQty}
                    productId={productId}
                    storeQuantity={storeQuantity}
                    autoExpand={focusAddDate}
                    costPrice={product?.store_cost_price}
                    sellingPrice={product?.store_selling_price}
                  />
                </div>
              )}

              {/* AUTOMATION section */}
              <div className="px-6 py-5">
                <Typography
                  variant="extraSmall"
                  color="muted"
                  className="uppercase italic tracking-wider mb-4"
                >
                  Automation
                </Typography>

                <ExpiryAutomationSection
                  productId={productId}
                  productName={productName}
                  categoryId={product?.category_id || ''}
                  categoryName={product?.category_display_name || 'Unknown'}
                />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function ProductMonogram({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      <div className="size-12 rounded-lg overflow-hidden shrink-0 bg-primary/10">
        <Image
          src={imageUrl}
          alt={name}
          width={36}
          height={36}
          className="object-cover w-full h-full"
        />
      </div>
    )
  }

  const initials = getInitials(name)
  return (
    <Typography
      color="secondary"
      variant="h4"
      className="size-12 rounded bg-primary/10 flex items-center justify-center shrink-0 font-black font-heading"
    >
      {initials}
    </Typography>
  )
}
