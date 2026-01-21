'use client'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Typography } from '@/components/ui/typography'
import type { Product } from '@/lib/queries/products'
import { useCategoryTranslation } from '@/hooks/use-category-translation'
import { useTranslations } from 'next-intl'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
}

export function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  const t = useTranslations('products')
  const { getCategoryName } = useCategoryTranslation()

  if (!product) {
    return null
  }

  const formatDate = (date: string | null) => {
    if (!date) return t('notAvailable')
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <BottomSheet
      className="min-w-xl"
      isOpen={isOpen}
      onClose={onClose}
      titleElement={
        <div className="flex flex-col gap-2 py-4">
          <Typography className="font-black" variant="h3">
            {product.name || t('unnamedProduct')}
          </Typography>
        </div>
      }
    >
      <div className="flex flex-col h-full max-h-[90vh]">
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* Stock Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Typography variant="p">{t('totalStock')}</Typography>
              </div>
              <Typography variant="h3">{product.total_stock || 0}</Typography>
            </div>
            <div className="bg-muted/30 rounded-2xl p-4">
              <div className="flex items-center justify-end text-right gap-2 mb-2">
                <Typography variant="p">{t('activeBatches')}</Typography>
              </div>
              <Typography variant="h3" className="text-right">
                {product.active_batches_count || 0}
              </Typography>
            </div>
          </div>

          {/* Product Details */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col bg-muted/30 rounded-2xl px-4">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-2">
                  <Typography variant="p">Category</Typography>
                </div>
                {product.category_code ? (
                  <Typography variant="p">{getCategoryName(product)}</Typography>
                ) : (
                  <Typography variant="p">{t('uncategorized')}</Typography>
                )}
              </div>

              <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-2">
                  <Typography variant="p">Brand</Typography>
                </div>
                <Typography variant="p">{product.brand || t('notAvailable')}</Typography>
              </div>

              <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-2">
                  <Typography variant="p">Date Added</Typography>
                </div>
                <Typography variant="p">{formatDate(product.created_at)}</Typography>
              </div>
            </div>

            {/* Edit in Square Note */}
            <div className="rounded-2xl px-4 py-8 flex flex-col text-center items-center gap-2">
              <Typography variant="h4" className="text-destructive font-black">
                Edit in Square
              </Typography>
              <Typography variant="h5" className="max-w-md font-medium">
                To edit product details, please use your Square dashboard or POS system.
              </Typography>
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
