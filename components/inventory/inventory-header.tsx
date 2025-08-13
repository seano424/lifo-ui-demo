'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Typography } from '../ui/typography'

export default function InventoryHeader() {
  const t = useTranslations('navigation')
  const pathname = usePathname()

  const isProducts = pathname.includes('products')
  const isBatches = pathname.includes('batches')

  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex gap-8 items-center">
        <Link href="/dashboard/inventory/products">
          <Typography
            variant="h2"
            className={cn(
              'text-3xl font-bold tracking-tight transition-colors hover:text-primary-500',
              isProducts
                ? 'text-primary-600 border-b-2 border-primary-500 pb-1'
                : 'text-muted-foreground',
            )}
          >
            {t('products')}
          </Typography>
        </Link>
        <span className="text-muted-foreground text-xl">|</span>
        <Link href="/dashboard/inventory/batches">
          <Typography
            variant="h2"
            className={cn(
              'text-3xl font-bold tracking-tight transition-colors hover:text-primary-500',
              isBatches
                ? 'text-primary-600 border-b-2 border-primary-500 pb-1'
                : 'text-muted-foreground',
            )}
          >
            {t('batches')}
          </Typography>
        </Link>
      </div>
    </div>
  )
}
