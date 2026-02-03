'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Typography } from '../ui/typography'
import { cn } from '@/lib/utils'
// import { Badge } from '../ui/badge'
import type { DraftBatchesSummary } from '@/hooks/use-draft-batches'

interface DeliveryBannerProps {
  totalDrafts: number
  isClosing?: boolean
  onDismiss: () => void
  summary: DraftBatchesSummary
}

/**
 * Delivery Banner Component
 *
 * Shows a dark banner when there are draft batches needing expiry dates.
 * Can be dismissed, but reappears when new drafts are created.
 */
export function DeliveryBanner({ totalDrafts, isClosing = false, onDismiss }: DeliveryBannerProps) {
  const t = useTranslations('dashboard.redesign.deliveryBanner')
  // const totalUnits = summary?.total_units || 0
  // const productsWithDrafts = summary?.products_with_drafts || 0

  return (
    <div
      className={cn(
        'flex-col gap-4 sm:flex-row flex sm:items-center sm:justify-between py-2 px-4 bg-card/0 border-b dark:border-y dark:border-card',
        'transition-all duration-300 ease-in-out',
        isClosing && 'opacity-0 -translate-y-full',
      )}
    >
      {/* Left: Icon + Message */}
      <div className="flex items-center gap-4">
        {/* <Badge variant="primary" className="aspect-square [&_svg]:size-4 p-2">
          <Box className="h-10 w-10" aria-hidden="true" />
        </Badge> */}
        <div className="flex flex-col gap-1">
          <Typography variant="small">{t('title', { count: totalDrafts })}</Typography>
          {/* <Typography variant="small">
            {t('description', { units: totalUnits, count: productsWithDrafts })}
          </Typography> */}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-between border-t border-border pt-4 sm:border-none sm:pt-0 sm:justify-end gap-1">
        <Button
          asChild
          size="xs"
          variant="subtleSecondary"
          asLink
          href="/dashboard/inventory/new"
          onClick={onDismiss}
        >
          {t('cta')}
        </Button>
        <Button size="icon" variant="ghost" onClick={onDismiss} aria-label={t('dismiss')}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
