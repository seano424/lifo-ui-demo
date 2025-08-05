'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function InventoryHeader() {
  const t = useTranslations('navigation')
  const pathname = usePathname()

  const isProducts = pathname.includes('products')
  const isBatches = pathname.includes('batches')

  return (
    <div className="flex justify-between items-center">
      <div className="flex gap-2 items-center">
        <Link href="/dashboard/inventory/products" className={cn(isProducts && 'text-primary-600')}>
          {t('products')}
        </Link>
        <Link href="/dashboard/inventory/batches" className={cn(isBatches && 'text-primary-600')}>
          {t('batches')}
        </Link>
      </div>
    </div>
  )
}
