'use client'

import { ArrowRight, Package } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

export interface ProductInfo {
  barcode: string
  productName?: string
  brand?: string
  category?: string
  imageUrl?: string
}

export interface ProductCardProps {
  product: ProductInfo
  mode?: 'selected' | 'display'
  showRemoveButton?: boolean
  showProceedButton?: boolean
  onRemove?: () => void
  onProceed?: () => void
  className?: string
}

export default function ProductCard({
  product,
  mode = 'display',
  showRemoveButton = false,
  showProceedButton = false,
  onRemove,
  onProceed,
  className = '',
}: ProductCardProps) {
  const t = useTranslations('productCard')
  return (
    <Card className={`border-primary-50 shadow-primary-100 ${className}`}>
      <CardContent className="p-3">
        <div className="flex justify-between items-center gap-2">
          {/* Remove Button */}
          {showRemoveButton && onRemove && (
            <Button
              variant="subtleDestructive"
              className="rounded-full p-2 h-8 w-8"
              onClick={onRemove}
            >
              X
            </Button>
          )}

          {/* Product Information */}
          <div className="flex flex-col gap-2 justify-center items-center flex-1">
            <Typography className="text-secondary-900 font-black" variant="p">
              {mode === 'selected' ? t('titles.selectedProduct') : t('titles.productInformation')}
            </Typography>
            <div className="flex flex-wrap text-center justify-center items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-gray-500" />

              {product.brand && (
                <>
                  <Typography variant="p">{product.brand}</Typography>
                  <Typography variant="p">•</Typography>
                </>
              )}

              <Typography variant="p">
                {product.productName || t('fallbacks.unknownProduct')}
              </Typography>

              <Typography variant="p">•</Typography>
              <Typography variant="p" className="font-mono text-xs">
                {product.barcode}
              </Typography>
            </div>
          </div>

          {/* Proceed Button */}
          {showProceedButton && onProceed && (
            <Button
              variant="subtleSecondary"
              className="font-semibold rounded-full p-2 h-8 w-8"
              onClick={onProceed}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
