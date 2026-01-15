'use client'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Typography } from '@/components/ui/typography'
import { Badge } from '@/components/ui/badge'
import type { Product } from '@/lib/queries/products'
import { useCategoryTranslation } from '@/hooks/use-category-translation'
import { useTranslations } from 'next-intl'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
}

const getCategoryBadgeColor = (category: string) => {
  const colors = {
    fresh_produce: 'bg-primary-100 text-primary-800 border-primary-200',
    fresh_meat_fish: 'bg-red-100 text-red-800 border-red-200',
    bakery_fresh: 'bg-orange-100 text-orange-800 border-orange-200',
    dairy: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    deli_prepared: 'bg-pink-100 text-pink-800 border-pink-200',
    frozen: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    dry_goods: 'bg-amber-100 text-amber-800 border-amber-200',
    beverages: 'bg-blue-100 text-blue-800 border-blue-200',
    spices_condiments: 'bg-purple-100 text-purple-800 border-purple-200',
    canned_jarred: 'bg-stone-100 text-stone-800 border-stone-200',
    chilled_packaged: 'bg-teal-100 text-teal-800 border-teal-200',
    pantry_staples: 'bg-slate-100 text-slate-800 border-slate-200',
    other: 'bg-gray-100 text-gray-800 border-gray-200',
  }
  return colors[category?.toLowerCase() as keyof typeof colors] || colors.other
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
      isOpen={isOpen}
      onClose={onClose}
      titleElement={
        <div className="flex flex-col gap-2">
          <Typography className="font-black" variant="h3">
            {product.name || t('unnamedProduct')}
          </Typography>
          <div className="flex items-center gap-2">
            <Typography variant="small" color="muted" className="font-mono">
              SKU: {product.sku || t('notAvailable')}
            </Typography>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full max-h-[90vh]">
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-32">
          {/* Stock Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-muted/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Typography variant="small" color="muted">
                  {t('totalStock')}
                </Typography>
              </div>
              <Typography variant="h3">{product.total_stock || 0}</Typography>
            </div>
            <div className="bg-muted/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Typography variant="small" color="muted">
                  {t('activeBatches')}
                </Typography>
              </div>
              <Typography variant="h3">{product.active_batches_count || 0}</Typography>
            </div>
          </div>

          {/* Product Details */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col divide-y divide-muted-foreground/10 bg-muted/30 rounded-2xl px-4">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-2">
                  <Typography variant="small" color="muted">
                    Category
                  </Typography>
                </div>
                {product.category_code ? (
                  <Badge
                    variant="outline"
                    className={`${getCategoryBadgeColor(product.category_code)}`}
                  >
                    {getCategoryName(product)}
                  </Badge>
                ) : (
                  <Typography variant="small">{t('uncategorized')}</Typography>
                )}
              </div>

              <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-2">
                  <Typography variant="small" color="muted">
                    Brand
                  </Typography>
                </div>
                <Typography variant="small">{product.brand || t('notAvailable')}</Typography>
              </div>

              <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-2">
                  <Typography variant="small" color="muted">
                    Date Added
                  </Typography>
                </div>
                <Typography variant="small">{formatDate(product.created_at)}</Typography>
              </div>
            </div>

            {/* Edit in Square Note */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-start gap-3">
              <div>
                <Typography variant="small" className="font-semibold mb-1">
                  Edit in Square
                </Typography>
                <Typography variant="small" color="muted">
                  To edit product details, please use your Square dashboard or POS system.
                </Typography>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
