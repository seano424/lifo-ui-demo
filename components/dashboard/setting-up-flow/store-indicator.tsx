'use client'

import { Typography } from '@/components/ui/typography'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'
import { useStoreState } from '@/lib/stores/store-context'
import { cn } from '@/lib/utils'

interface StoreIndicatorProps {
  className?: string
}

export function StoreIndicator({ className }: StoreIndicatorProps) {
  const t = useTranslations('setupFlow.batchTracking')
  const { activeStore } = useStoreState()

  if (!activeStore) {
    return null
  }

  return (
    <div className={cn('bg-muted/50 rounded-xl border border-muted py-2.5 px-4', className)}>
      <div className="flex items-center flex-col lg:flex-row gap-3">
        {/* <div className="w-10 h-10 bg-secondary-100/30 rounded-lg flex items-center justify-center shrink-0 border border-secondary-100">
          <Store className="w-5 h-5 text-secondary-800" />
        </div> */}
        <div className="flex-1">
          <Typography variant="extraSmall" className="mb-0.5">
            {t('configuringFor')}
          </Typography>
          <Typography variant="small" color="secondary">
            {activeStore.store_name}
          </Typography>
        </div>
        <Badge variant="secondary" className="hidden lg:block">
          {t('activeStore')}
        </Badge>
      </div>
    </div>
  )
}
