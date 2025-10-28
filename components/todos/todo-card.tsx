'use client'

import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import type { TodoItem } from '@/lib/queries/todos-rpc'

import { cn } from '@/lib/utils'
import { migrateRecommendation } from '@/lib/utils/recommendation-migration'
import { Calendar, Package, PenLine, CheckIcon } from 'lucide-react'
import { startOfDay, isToday, differenceInDays, addDays, isBefore } from 'date-fns'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

interface TodoCardProps {
  todo: TodoItem
  onClick?: () => void
}

// Move urgency config outside component for better performance
const URGENCY_CONFIG = {
  critical: {
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'group-hover:bg-red-500 bg-red-100',
    badge: 'bg-red-200 text-red-800 border-red-500',
    badgeVariant: 'default' as const,
    borderColor: 'border-red-500',
  },
  high: {
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'group-hover:bg-red-50 bg-red-500',
    badge: 'bg-red-100 text-red-800 border-red-500',
    badgeVariant: 'default' as const,
    borderColor: 'border-red-500',
  },
  medium: {
    color: 'bg-primary-500',
    textColor: 'text-primary-700',
    bgColor: 'group-hover:bg-primary-50 bg-primary-500',
    badge: 'bg-primary-100 text-primary-800 border-primary-500',
    badgeVariant: 'primary' as const,
    borderColor: 'border-primary-500',
  },
  low: {
    color: 'bg-secondary-500',
    textColor: 'text-secondary-700',
    bgColor: 'group-hover:bg-secondary-50 bg-secondary-500',
    badge: 'bg-secondary-100 text-secondary-800 border-secondary-500',
    badgeVariant: 'secondary' as const,
    borderColor: 'border-secondary-500',
  },
  none: {
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    bgColor: 'group-hover:bg-gray-50 bg-gray-500',
    badge: 'bg-gray-100 text-gray-800 border-gray-200',
    badgeVariant: 'secondary' as const,
    borderColor: 'border-gray-500',
  },
  default: {
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    bgColor: 'group-hover:bg-gray-50 bg-gray-500',
    badge: 'bg-gray-100 text-gray-800 border-gray-200',
    badgeVariant: 'secondary' as const,
    borderColor: 'border-gray-500',
  },
} as const

export function TodoCard({ todo, onClick }: TodoCardProps) {
  const t = useTranslations('todos')

  const handleCardClick = () => {
    onClick?.()
  }

  // Format expiry date with reliable timezone handling using date-fns
  const expiryDate = todo.expiry_date ? new Date(todo.expiry_date) : new Date()
  const today = new Date()

  // Use date-fns for reliable date comparisons
  const expiryStartOfDay = startOfDay(expiryDate)
  const todayStartOfDay = startOfDay(today)
  const tomorrowStartOfDay = addDays(todayStartOfDay, 1)

  const isExpiringSoon = isBefore(expiryStartOfDay, tomorrowStartOfDay) || isToday(expiryDate)
  const isExpiring = isBefore(expiryStartOfDay, todayStartOfDay)
  const isExpiringToday = isToday(expiryDate)

  // Get standardized recommendation and translate it
  const getRecommendationText = (recommendation: string | null | undefined): string => {
    // Frontend safeguard: Override bad recommendations for expired items
    if (isExpiring && recommendation !== 'dispose') {
      return t('recommendations.dispose')
    }

    if (!recommendation) return t('card.noRecommendation')

    // Migrate legacy recommendations to standard format
    const standardRec = migrateRecommendation(recommendation)

    // Try to get translation, fallback to formatted text if translation doesn't exist
    try {
      return t(`recommendations.${standardRec}`)
    } catch {
      // Fallback: capitalize and format if translation missing
      return standardRec.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  // Calculate days since expiry for expiring items using date-fns
  const getExpiringText = () => {
    if (!isExpiring) return ''

    const diffDays = differenceInDays(todayStartOfDay, expiryStartOfDay)

    if (diffDays === 1) return t('card.expiredYesterday')
    return t('card.expired', { days: diffDays })
  }

  // Simple lookup for urgency configuration - no memoization needed since config is static
  const urgencyConfig =
    URGENCY_CONFIG[todo.urgency_level as keyof typeof URGENCY_CONFIG] || URGENCY_CONFIG.default

  // Get standardized recommendation for badge display
  // Frontend safeguard: Override bad recommendations for expired items
  const standardRecommendation = isExpiring
    ? 'dispose'
    : migrateRecommendation(todo.ai_recommendation)

  const wasDiscounted = todo.last_discount_percent != null && todo.last_discount_percent > 0
  const wasDonated = todo.last_action_type === 'donate'
  const wasDisposed = todo.last_action_type === 'dispose'
  const isCompleted = todo.completion_status === 'completed'
  const lastActionType = todo.last_action_type
  const completionDate = todo.last_action_time ? new Date(todo.last_action_time) : null

  const getCompletionDateText = () => {
    const date = completionDate?.toLocaleDateString() ?? ''
    switch (lastActionType) {
      case 'donate':
        return t('card.donatedOn', { date })
      case 'dispose':
        return t('card.disposedOn', { date })
      case 'sold':
        return t('card.completedOn', { date })
      default:
        return t('card.completedOn', { date })
    }
  }

  // Debug logging - logs when batch_number matches
  useEffect(() => {
    const batchNumToCheck = '17215fdb_URGENT-004_20251021_004'
    if (todo.batch_number === batchNumToCheck) {
      console.log('todo', todo)
    }
  }, [todo.batch_number, todo])

  return (
    <button
      type="button"
      className={cn(
        'cursor-pointer transition-all duration-1000',
        'border rounded-2xl p-4 flex flex-col',
        urgencyConfig.borderColor,
      )}
      onClick={handleCardClick}
    >
      <div className="flex gap-3 items-start relative group">
        <Badge
          variant="outline"
          className={cn(
            'border-2 rounded-full cursor-pointer',
            'sm:h-6 sm:w-6 h-5 w-5 p-0 bg-brand-white dark:bg-brand-dark transition-all duration-200 items-center justify-center',
            urgencyConfig.badge,
          )}
        >
          {isCompleted && (
            <CheckIcon className="h-4 w-4 text-primary dark:text-secondary-400 stroke-3" />
          )}
        </Badge>

        <div className="flex flex-col min-w-0 flex-1 gap-4">
          <div className="flex flex-col gap-2 items-start text-left min-w-0">
            <Typography variant="h4" className="truncate w-full pb-1">
              {todo.product_name}
            </Typography>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center flex-wrap divide-x divide-muted">
              <Typography variant="muted" className="flex items-center gap-1 pr-2">
                <Calendar className="h-3 w-3" />
                {expiryDate.toLocaleDateString()}
              </Typography>

              {!isCompleted && (
                <Typography variant="muted" className="flex items-center gap-1 px-2">
                  <Package className="h-3 w-3" />
                  {t('card.unitsLeft', {
                    quantity: todo.current_quantity ?? 0,
                  })}
                </Typography>
              )}

              {isCompleted && lastActionType === 'sold' && (
                <Typography variant="small" className="flex items-center gap-1 px-2">
                  🎉 {t('card.allSold')}
                </Typography>
              )}
              {/* {isCompleted && lastActionType === 'sold' && (
              )} */}

              {isCompleted && wasDonated && (
                <Typography variant="small" className="flex items-center gap-1">
                  🎁 {t('card.donated')}
                </Typography>
              )}

              {isCompleted && wasDisposed && (
                <Typography variant="small" className="flex items-center gap-1">
                  🗑️ {t('card.disposed')}
                </Typography>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* AI Recommendation Badge */}
              {!isCompleted && (
                <Badge variant={urgencyConfig.badgeVariant}>
                  {getRecommendationText(todo.ai_recommendation)}
                </Badge>
              )}

              {isCompleted && wasDisposed && (
                <Badge variant={'default'}>{t('card.disposed')}</Badge>
              )}

              {todo.last_discount_percent != null &&
                todo.last_discount_percent > 0 &&
                !wasDiscounted &&
                !isCompleted && (
                  <Badge variant={urgencyConfig.badgeVariant}>
                    {t('card.suggestedDiscount', {
                      percent: todo.last_discount_percent,
                    })}
                  </Badge>
                )}

              {wasDiscounted && (
                <Badge variant={urgencyConfig.badgeVariant}>
                  {t('card.currentlyDiscounted', {
                    percent: todo.last_discount_percent ?? 0,
                  })}
                </Badge>
              )}

              {/* Only show "Healthy & Maintain" if not expired/expiring and no discount */}
              {standardRecommendation === 'maintain' &&
                (todo.last_discount_percent == null || todo.last_discount_percent === 0) &&
                !isCompleted &&
                !isExpiring &&
                !isExpiringToday &&
                !isExpiringSoon && (
                  <Badge variant={urgencyConfig.badgeVariant}>{t('card.healthyMaintain')}</Badge>
                )}

              {isCompleted ? (
                <Badge variant="primary">{getCompletionDateText()}</Badge>
              ) : isExpiringToday ? (
                <Badge variant="default">{t('card.expiresToday')}</Badge>
              ) : isExpiring ? (
                <Badge variant="default">{getExpiringText()}</Badge>
              ) : isExpiringSoon ? (
                <Badge variant="primary">{t('card.expiringSoon')}</Badge>
              ) : wasDonated ? (
                <Badge className="hidden" variant="primary">
                  {t('card.donated')}
                </Badge>
              ) : (
                <Badge variant="primary">{t('card.activeHealthy')}</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="absolute right-4 top-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-muted rounded p-1.5 group/edit">
          <PenLine className="h-4 w-4" />
          <div className="absolute right-2 text-xs w-min text-nowrap bg-brand-dark font-medium text-white rounded-lg py-1 px-2.5 -top-full opacity-0 group-hover/edit:opacity-100 transition-all duration-1000 delay-300">
            {t('card.editTodo')}
          </div>
        </div>
      </div>
    </button>
  )
}
