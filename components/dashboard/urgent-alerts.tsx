'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useStoreAnalytics } from '@/hooks/use-scoring-analytics'
import { useScoringThresholds } from '@/hooks/use-scoring-thresholds'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { AlertQuickToggle } from './alert-quick-toggle'

// Convert threshold to user-friendly level names
function thresholdToLevelName(
  warningThreshold: number,
  t: ReturnType<typeof useTranslations>,
): string {
  if (warningThreshold >= 0.8) return t('levels.urgentOnly') // Critical - Most restrictive - fewest items
  if (warningThreshold >= 0.6) return t('levels.priority') // High - Moderately restrictive
  if (warningThreshold >= 0.4) return t('levels.allFlagged') // Medium - Less restrictive - more items
  return t('levels.completeReview') // Low - Least restrictive - most items
}

export function UrgentAlerts() {
  const t = useTranslations('storeInsights.urgentAlerts')
  const activeStoreId = useActiveStoreId()
  const { data, isLoading, error } = useStoreAnalytics(activeStoreId, '7d')
  const { warningThreshold } = useScoringThresholds(activeStoreId || undefined)

  const isInitialLoading = isLoading
  const currentLevel = thresholdToLevelName(warningThreshold, t)

  if (isInitialLoading) {
    return (
      <div className="flex flex-col gap-4 sm:flex-row text-center sm:text-left items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-7 w-64" />
        </div>

        <Skeleton className="h-7 w-32" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 sm:flex-row text-center sm:text-left items-center justify-between">
        <div className="flex flex-col gap-2">
          <Typography variant="h4" className="font-bold text-red-600">
            {t('errors.connectionError')}
          </Typography>
          <Typography variant="p">{t('errors.unableToLoad')}</Typography>
        </div>
        <Link href="/dashboard/inventory/batches?filter=expiring">
          <Button variant="outline" className="gap-2">
            {t('buttons.viewInventory')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  // Updated to use new FastAPI dashboard structure
  const urgencyDistribution = data?.analytics?.fastapi_analytics?.urgency_distribution
  const supabaseInsights = data?.analytics?.insights

  const formatMessageWithBold = (message: string) => {
    // Match patterns like "8 critical items" at the beginning
    const match = message.match(/^(\d+\s+[^(]+?)(\s*\(|$|expiring|need)(.*)/)
    if (match) {
      const boldPart = match[1].trim()
      const rest = (match[2] + match[3]).trim()
      return (
        <span>
          <span className="font-bold text-primary">{boldPart}</span> {rest}
        </span>
      )
    }
    return message
  }

  const getMessage = () => {
    // Prefer urgency_distribution when available (works for both FastAPI and Supabase fallback now)
    if (urgencyDistribution) {
      const criticalCount = urgencyDistribution.critical || 0
      const highCount = urgencyDistribution.high || 0
      const mediumCount = urgencyDistribution.medium || 0
      const lowCount = urgencyDistribution.low || 0
      const totalAlerts = criticalCount + highCount + mediumCount + lowCount

      return getUrgencyMessage(criticalCount, highCount, mediumCount, lowCount, totalAlerts)
    }

    // Priority 2: Use FastAPI urgency distribution if available
    if (
      urgencyDistribution &&
      typeof urgencyDistribution === 'object' &&
      urgencyDistribution !== null
    ) {
      const dist = urgencyDistribution as {
        critical?: number
        high?: number
        medium?: number
        low?: number
      }
      const criticalCount = dist.critical || 0
      const highCount = dist.high || 0
      const mediumCount = dist.medium || 0
      const lowCount = dist.low || 0
      const totalAlerts = criticalCount + highCount + mediumCount + lowCount

      return getUrgencyMessage(criticalCount, highCount, mediumCount, lowCount, totalAlerts)
    }

    // Fallback: Use Supabase insights structure (less accurate)
    if (
      supabaseInsights?.high_urgency &&
      supabaseInsights?.expiring_soon &&
      supabaseInsights?.ready_for_discount
    ) {
      const criticalCount = supabaseInsights.high_urgency.count || 0
      const highCount = Math.max(0, (supabaseInsights.expiring_soon.count || 0) - criticalCount)
      const mediumCount = supabaseInsights.ready_for_discount.count || 0
      const lowCount = 0 // This fallback doesn't have low priority classification
      const totalAlerts = criticalCount + highCount + mediumCount + lowCount

      return getUrgencyMessage(criticalCount, highCount, mediumCount, lowCount, totalAlerts)
    }

    return t('errors.loadingAlerts')
  }

  const getUrgencyMessage = (
    criticalCount: number,
    highCount: number,
    mediumCount: number,
    lowCount: number,
    totalAlerts: number,
  ) => {
    if (totalAlerts === 0) {
      return t('messages.nothingToShow')
    }

    // Build message based on selected urgency level
    const messageParts: (string | ReactNode)[] = []

    // Always include critical if present
    if (criticalCount > 0) {
      messageParts.push(
        formatMessageWithBold(t('messages.criticalItems', { count: criticalCount })),
      )
    }

    // Include high priority based on threshold
    if (highCount > 0 && warningThreshold <= 0.6) {
      messageParts.push(
        formatMessageWithBold(t('messages.highPriorityItems', { count: highCount })),
      )
    }

    // Include medium priority only if threshold allows
    if (mediumCount > 0 && warningThreshold <= 0.4) {
      messageParts.push(
        formatMessageWithBold(t('messages.mediumPriorityItems', { count: mediumCount })),
      )
    }

    // Include low priority only if threshold allows
    if (lowCount > 0 && warningThreshold <= 0.2) {
      messageParts.push(formatMessageWithBold(t('messages.lowPriorityItems', { count: lowCount })))
    }

    // Critical only mode (threshold 0.8)
    if (warningThreshold >= 0.8) {
      if (criticalCount > 0) {
        return formatMessageWithBold(t('messages.criticalItemsAction', { count: criticalCount }))
      }
      if (highCount > 0) {
        return formatMessageWithBold(t('messages.highPriorityItems', { count: highCount }))
      }
      return t('messages.nothingToShow')
    }

    // Return formatted message parts as separate lines
    if (messageParts.length === 0) {
      return t('messages.nothingToShow')
    }

    return (
      <div className="space-y-1">
        {messageParts.map((part, index) => (
          <div key={`${typeof part === 'string' ? part.slice(0, 20) : 'message'}-${index}`}>
            {part}
          </div>
        ))}
      </div>
    )
  }

  const message = getMessage()

  return (
    <div className="flex flex-col gap-4 text-center lg:text-left items-center justify-between lg:flex-row">
      <div className="flex flex-col gap-2 lg:w-3/5">
        <Typography variant="h4" className="font-bold">
          {currentLevel}
        </Typography>
        <Typography className="lg:min-h-10">{message}</Typography>
        <AlertQuickToggle
          storeId={activeStoreId || undefined}
          size="sm"
          className="mt-2 self-center lg:self-start"
        />
      </div>

      <Link href="/dashboard/inventory/batches?filter=expiring">
        <Button variant="subtleSecondary" className="gap-2">
          {t('buttons.viewItems')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  )
}
