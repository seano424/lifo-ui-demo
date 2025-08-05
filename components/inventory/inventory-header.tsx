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
    <div className="flex justify-between items-center">
      <div className="flex gap-5 items-center">
        <Link href="/dashboard/inventory/products">
          <Typography
            variant="h2"
            className={cn(
              'font-black italic uppercase',
              isProducts && 'text-primary-600 underline underline-offset-4',
            )}
          >
            {t('products')}
          </Typography>
        </Link>
        <span className="text-primary-600">/</span>
        <Link href="/dashboard/inventory/batches">
          <Typography
            variant="h2"
            className={cn(
              'font-black italic uppercase',
              isBatches && 'text-primary-600 underline underline-offset-4',
            )}
          >
            {t('batches')}
          </Typography>
        </Link>
      </div>
    </div>
  )
}
