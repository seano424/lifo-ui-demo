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
  summary: DraftBatchesSummary | undefined
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
        'flex items-center justify-between gap-2',
        'py-3 px-4 sm:py-2 bg-[#363644] dark:border-y dark:border-card dark:bg-card/0',
        'transition-all duration-300 ease-in-out',
        isClosing && 'opacity-0 -translate-y-full',
      )}
    >
      {/* Left: Message (clickable on mobile) */}
      <Button
        asChild
        variant="link"
        className="h-auto p-0 text-white hover:text-white/80 sm:pointer-events-none sm:hover:no-underline"
        asLink
        href="/dashboard/inventory/new"
        onClick={onDismiss}
      >
        <Typography
          variant="small"
          color="white"
          className="dark:text-secondary sm:dark:text-muted-foreground"
        >
          {t('title', { count: totalDrafts })}
        </Typography>
      </Button>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          asChild
          size="xs"
          variant="ghost"
          className="hidden text-white hover:bg-white/10 sm:inline-flex"
          asLink
          href="/dashboard/inventory/new"
          onClick={onDismiss}
        >
          {t('cta')}
        </Button>
        <Button
          className="text-white hover:bg-white/10"
          size="icon"
          variant="ghost"
          onClick={onDismiss}
          aria-label={t('dismiss')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
