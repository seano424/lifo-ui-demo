'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDraftBatchesSummary } from '@/hooks/use-draft-batches'
import { useIgnoredBatchesSummary } from '@/hooks/use-ignored-batches'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/ui/typography'

const DISMISSED_STORAGE_KEY = 'lifo_dismissed_drafts'

interface DismissedState {
  count: number
  timestamp: number
}

/**
 * Get dismissed drafts state from localStorage
 */
function getDismissedState(): DismissedState | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(DISMISSED_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/**
 * Save dismissed drafts state to localStorage
 */
function setDismissedState(count: number) {
  if (typeof window === 'undefined') return

  const state: DismissedState = {
    count,
    timestamp: Date.now(),
  }

  try {
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Clear dismissed state from localStorage
 */
function clearDismissedState() {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(DISMISSED_STORAGE_KEY)
  } catch {
    // Ignore localStorage errors
  }
}

interface DraftBatchNotificationProps {
  variant?: 'full' | 'compact'
  className?: string
}

/**
 * Draft batch notification component
 *
 * Shows a notification when there are draft batches that need expiry dates.
 * Can be dismissed, but reappears when new drafts are created.
 *
 * @example
 * ```tsx
 * // Full version for dashboard/banner
 * <DraftBatchNotification variant="full" />
 *
 * // Compact version for sidebar (just badge)
 * <DraftBatchNotification variant="compact" />
 * ```
 */
export function DraftBatchNotification({
  variant = 'full',
  className,
}: DraftBatchNotificationProps) {
  const storeId = useActiveStoreId()
  const { data: summary, isLoading } = useDraftBatchesSummary(storeId || undefined)
  const [isDismissed, setIsDismissed] = useState(false)

  const totalDrafts = summary?.total_draft_batches || 0
  const totalUnits = summary?.total_units || 0

  // Check if notification should be shown
  useEffect(() => {
    if (!summary || totalDrafts === 0) {
      setIsDismissed(false)
      clearDismissedState()
      return
    }

    const dismissedState = getDismissedState()

    if (dismissedState) {
      // Show notification if draft count increased since dismissal
      if (totalDrafts > dismissedState.count) {
        setIsDismissed(false)
        clearDismissedState()
      } else {
        setIsDismissed(true)
      }
    } else {
      setIsDismissed(false)
    }
  }, [summary, totalDrafts])

  const handleDismiss = () => {
    setIsDismissed(true)
    setDismissedState(totalDrafts)
  }

  // Don't show if loading, no drafts, or dismissed
  if (isLoading || totalDrafts === 0 || isDismissed) {
    return null
  }

  // Compact version (for sidebar)
  if (variant === 'compact') {
    return (
      <Link
        href="/dashboard/inventory/new"
        className={cn('inline-flex items-center justify-center', 'relative', className)}
      >
        <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs font-semibold">
          {totalDrafts}
        </Badge>
      </Link>
    )
  }

  // Full version (for dashboard/banner)
  return (
    <Alert className={cn('flex gap-4', className)}>
      {/* Icon */}
      {/* <div className="shrink-0 mt-0.5">
        <Package className="h-5 w-5 text-primary" />
      </div> */}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <AlertDescription>
          <Typography variant="h3" color="primary" className="mb-1">
            {totalDrafts} {totalDrafts === 1 ? 'item needs' : 'items need'} expiry dates
          </Typography>
          <Typography variant="p">
            {totalUnits} units across {summary?.products_with_drafts || 0} products are waiting to
            be activated
          </Typography>
        </AlertDescription>

        {/* Action Button */}
        <div className="mt-3">
          <Button
            asChild
            asLink
            href="/dashboard/inventory/new"
            variant="black"
            className="rounded-4xl font-bold tracking-tight px-3"
          >
            Add Expiry Dates
          </Button>
        </div>
      </div>

      {/* Dismiss Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        className="shrink-0 h-8 w-8 border"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  )
}

/**
 * Compact badge version for sidebar navigation items
 * Returns just the count number for use in badge prop
 *
 * @example
 * ```tsx
 * const draftCount = useDraftBatchCount()
 *
 * <NavItem
 *   title="New Batches"
 *   badge={draftCount}
 * />
 * ```
 */
export function useDraftBatchCount(): number | undefined {
  const storeId = useActiveStoreId()
  const { data: summary } = useDraftBatchesSummary(storeId || undefined)

  const totalDrafts = summary?.total_draft_batches || 0
  return totalDrafts > 0 ? totalDrafts : undefined
}

/**
 * Compact badge version for sidebar navigation items (ignored batches)
 * Returns just the count number for use in badge prop
 *
 * @example
 * ```tsx
 * const ignoredCount = useIgnoredBatchCount()
 *
 * <NavItem
 *   title="Ignored Batches"
 *   badge={ignoredCount}
 * />
 * ```
 */
export function useIgnoredBatchCount(): number | undefined {
  const storeId = useActiveStoreId()
  const { data: summary } = useIgnoredBatchesSummary(storeId || undefined)

  const totalIgnored = summary?.total_ignored_batches || 0
  return totalIgnored > 0 ? totalIgnored : undefined
}
