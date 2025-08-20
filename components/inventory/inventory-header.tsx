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
    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
      <div className="flex gap-8 items-center">
        <Link href="/dashboard/inventory/products">
          <Typography
            variant="h2"
            className={cn(
              'transition-colors duration-100 ease-in-out hover:text-primary border-b-2 border-transparent pb-1 font-bold',
              isProducts ? 'text-primary border-b-2 border-primary-500' : 'text-secondary-500',
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
              'transition-colors duration-100 ease-in-out hover:text-primary border-b-2 border-transparent pb-1 font-bold',
              isBatches ? 'text-primary border-primary-500' : 'text-secondary-500',
            )}
          >
            {t('batches')}
          </Typography>
        </Link>
      </div>
    </div>
  )
}
