'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { ProductOverrideRow } from './product-override-row'
import { useProductsForTrackingSetup } from '@/lib/queries/batch-tracking-onboarding'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { ProductOverride } from '../batch-tracking-step'

interface CategoryProductExpandProps {
  categoryId: string
  storeId: string | null
  categoryMode: 'auto' | 'manual'
  categoryDays: number | null
  productOverrides: Record<string, ProductOverride>
  onUpdateProductOverride: (productId: string, override: ProductOverride) => void
  onClearProductOverride: (productId: string) => void
}

/**
 * Category Product Expand Component
 *
 * Expandable section that shows products within a category.
 * Allows per-product mode and shelf life overrides.
 */
export function CategoryProductExpand({
  categoryId,
  storeId,
  categoryMode,
  categoryDays,
  productOverrides,
  onUpdateProductOverride,
  onClearProductOverride,
}: CategoryProductExpandProps) {
  const t = useTranslations('setupFlow.batchTracking.steps.howToTrack.products')
  const [isExpanded, setIsExpanded] = useState(false)

  // Only fetch products when expanded
  const { data: products, isLoading } = useProductsForTrackingSetup(storeId || '', {
    categoryId: categoryId === 'uncategorized' ? null : categoryId,
    pageSize: 50,
  })

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="border-t pt-3">
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className="w-full justify-start text-sm text-muted-foreground hover:text-foreground"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 mr-2" />
        ) : (
          <ChevronRight className="h-4 w-4 mr-2" />
        )}
        {t('expandButton')}
      </Button>

      {/* Expanded Product List */}
      {isExpanded && (
        <div className={cn('mt-3 pl-6 space-y-2', 'animate-in slide-in-from-top-2 duration-200')}>
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && (!products || products.length === 0) && (
            <div className="py-6 text-center">
              <Typography variant="small" className="text-muted-foreground">
                {t('noProducts')}
              </Typography>
            </div>
          )}

          {!isLoading && products && products.length > 0 && (
            <div className="space-y-1">
              {products.map(product => (
                <ProductOverrideRow
                  key={product.product_id}
                  productId={product.product_id}
                  productName={product.name || 'Unknown Product'}
                  override={productOverrides[product.product_id] || null}
                  categoryMode={categoryMode}
                  categoryDays={categoryDays}
                  onUpdate={onUpdateProductOverride}
                  onClear={onClearProductOverride}
                />
              ))}
            </div>
          )}

          {!isLoading && products && products.length >= 50 && (
            <Typography variant="small" className="text-muted-foreground text-center pt-2">
              {t('showingLimit')}
            </Typography>
          )}
        </div>
      )}
    </div>
  )
}
