'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Typography } from '../ui/typography'
import { cn } from '@/lib/utils'

// TODO: Update this component for future untracked stock feature
interface DeliveryBannerProps {
  totalDrafts: number
  isClosing?: boolean
  onDismiss: () => void
  summary?: unknown // Placeholder for future use
}

/**
 * Delivery Banner Component
 *
 * Shows a dark banner when there are incomplete batches needing expiry dates.
 * Can be dismissed, but reappears when new incomplete batches are created.
 *
 * Note: The dedicated "draft batch workflow" was removed in PR #310.
 * This component is preserved for future untracked stock feature.
 */
export function DeliveryBanner({ totalDrafts, isClosing = false, onDismiss }: DeliveryBannerProps) {
  const t = useTranslations('dashboard.redesign.deliveryBanner')

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2',
        'py-3 px-4 sm:py-2 bg-none border-b border-muted dark:border-y dark:border-card dark:bg-card/0',
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
        <Typography variant="small">{t('title', { count: totalDrafts })}</Typography>
      </Button>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          asChild
          size="xs"
          variant="ghost"
          className="hidden hover:bg-white/10 sm:inline-flex"
          asLink
          href="/dashboard/inventory/new"
          onClick={onDismiss}
        >
          {t('cta')}
        </Button>
        <Button
          className="hover:bg-white/10"
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
