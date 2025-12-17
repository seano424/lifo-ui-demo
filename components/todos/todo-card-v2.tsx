'use client'

import type { TodoItem } from '@/lib/queries/todos-rpc'
import { cn } from '@/lib/utils'
import { migrateRecommendation } from '@/lib/utils/recommendation-migration'
import {
  Calendar,
  PackageIcon,
  HandHeartIcon,
  PercentIcon,
  Trash2Icon,
  EyeIcon,
} from 'lucide-react'
import { Typography } from '../ui/typography'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import {
  calculateTodoDateInfo,
  type ActionButtonConfig,
  type StatusBadgeConfig,
} from '@/lib/utils/todo-status'

interface TodoCardV2Props {
  todo: TodoItem
  onClick?: () => void
}

// Status badge colors
const STATUS_COLORS = {
  expired: 'text-primary',
  today: 'text-primary',
  tomorrow: 'text-secondary',
  thisWeek: 'text-secondary',
  default: 'text-foreground-muted',
} as const

export function TodoCardV2({ todo, onClick }: TodoCardV2Props) {
  const t = useTranslations('todos')

  // Validate required fields
  if (!todo) {
    throw new Error('TodoCardV2: todo prop is required')
  }

  // Memoize date calculations for performance (runs only when expiry_date changes)
  const dateInfo = useMemo(() => calculateTodoDateInfo(todo.expiry_date), [todo.expiry_date])

  const { expiryDate, isExpiring, isExpiringToday, isExpiringTomorrow, daysUntilExpiry } = dateInfo

  // Get status badge text and color - memoized to avoid recalculation
  const statusBadge = useMemo((): StatusBadgeConfig | null => {
    if (isExpiring) {
      return {
        text: t('card.expiredStatus'),
        color: STATUS_COLORS.expired,
      }
    }
    if (isExpiringToday) {
      return {
        text: t('card.expiresToday'),
        color: STATUS_COLORS.today,
      }
    }
    if (isExpiringTomorrow) {
      return {
        text: t('card.expiresTomorrow'),
        color: STATUS_COLORS.tomorrow,
      }
    }
    if (daysUntilExpiry <= 7) {
      return {
        text: t('card.daysLeft', { days: daysUntilExpiry }),
        color: STATUS_COLORS.thisWeek,
      }
    }
    return null
  }, [isExpiring, isExpiringToday, isExpiringTomorrow, daysUntilExpiry, t])

  // Get action button configuration - memoized for performance
  const actionButton = useMemo((): ActionButtonConfig => {
    const standardRecommendation = isExpiring
      ? 'dispose'
      : migrateRecommendation(todo.ai_recommendation)

    // Expired items
    if (isExpiring) {
      return {
        text: t('actions.dispose'),
        variant: 'destructive',
        icon: Trash2Icon,
      }
    }

    // Items with discount recommendation
    if (
      todo.last_discount_percent != null &&
      todo.last_discount_percent > 0 &&
      !todo.completion_status
    ) {
      return {
        text: `${todo.last_discount_percent}% Discount`,
        variant: 'outline',
      }
    }

    // Default action based on recommendation
    switch (standardRecommendation) {
      case 'donate':
        return {
          text: t('actions.donate'),
          icon: HandHeartIcon,
          variant: 'outline',
        }
      case 'dispose':
        return {
          text: t('actions.dispose'),
          icon: Trash2Icon,
          variant: 'destructive',
        }
      case 'discount':
        return {
          text: t('actions.discount'),
          icon: PercentIcon,
          variant: 'outline',
        }
      default:
        return {
          text: t('actions.monitorStock'),
          icon: EyeIcon,
          variant: 'ghost',
        }
    }
  }, [isExpiring, todo.ai_recommendation, todo.last_discount_percent, todo.completion_status, t])

  // Calculate value at risk - fixed null safety (use != null instead of &&)
  const valueAtRisk =
    todo.current_quantity != null && todo.unit_price != null
      ? todo.current_quantity * todo.unit_price
      : null

  const handleCardClick = () => {
    onClick?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle keyboard activation (Enter or Space)
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleCardClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      aria-label={`Todo item: ${todo.product_name}`}
      className="flex flex-col gap-2 shadow-xs shadow-primary-50 border border-gray-100 rounded-2xl bg-white sm:hover:shadow-lg sm:hover:shadow-primary-400/50 sm:hover:-translate-y-0.5 transition-all duration-400 cursor-pointer overflow-hidden"
    >
      <div
        className={cn(
          'w-full text-left flex items-center justify-between group px-4 py-6 border-t-4',
          daysUntilExpiry <= 7 && 'border-secondary',
          isExpiring && 'border-primary',
          isExpiringToday && 'border-primary',
          isExpiringTomorrow && 'border-secondary',
        )}
      >
        {/* Card content */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between w-full">
          {/* Left section: Product info */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Product name + status badge */}
            <div className="flex gap-4 flex-wrap flex-col-reverse sm:flex-row">
              <Typography className="font-heading" variant="h4">
                {todo.product_name}
              </Typography>

              <Typography
                variant="small"
                className={cn(
                  statusBadge ? statusBadge.color : 'text-gray-600',
                  'flex items-center gap-1 text-xs sm:text-sm',
                )}
              >
                <Calendar className="h-3 w-3" />
                {statusBadge?.text}
                {!statusBadge && format(expiryDate, 'MMM dd yyyy')}
              </Typography>
            </div>

            {/* Units + action summary */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Typography variant="small" className="flex items-center gap-1.5">
                <PackageIcon className="h-4 w-4 text-gray-400" />
                <span>
                  {(() => {
                    const currentQty = todo.current_quantity ?? 0
                    const lastActionType = todo.last_action_type
                    const lastActionQty = todo.last_action_quantity ?? 0
                    const discountPercent = todo.last_discount_percent
                    const totalDiscounted = todo.total_discounted_quantity ?? 0

                    // Case 1: Donate or Dispose action
                    if (
                      (lastActionType === 'donate' || lastActionType === 'dispose') &&
                      lastActionQty > 0
                    ) {
                      const actionLabel =
                        lastActionType === 'donate'
                          ? t('card.donatedAction')
                          : t('card.disposedAction')
                      return `${currentQty} ${t('card.remaining')} • ${lastActionQty} ${actionLabel}`
                    }

                    // Case 2: Discount applied
                    if (
                      lastActionType === 'discount' &&
                      discountPercent != null &&
                      discountPercent > 0
                    ) {
                      // Check if discount is partial or full
                      if (totalDiscounted > 0 && totalDiscounted < currentQty) {
                        return `${currentQty} ${t('card.units')} • ${discountPercent}% ${t('card.discountAppliedToUnits', { count: totalDiscounted })}`
                      }
                      return `${currentQty} ${t('card.units')} • ${discountPercent}% ${t('card.discountApplied')}`
                    }

                    // Case 3: No actions yet - show value
                    if (valueAtRisk != null) {
                      return `${currentQty} ${t('card.units')} • €${valueAtRisk.toFixed(0)}`
                    }

                    // Fallback: just quantity
                    return `${currentQty} ${t('card.units')}`
                  })()}
                </span>
              </Typography>
            </div>
          </div>

          {/* Right section: Action button + chevron */}
          <div className="flex items-center gap-2">
            <div className="flex sm:flex-col sm:items-end items-center gap-1">
              <Typography variant="extraSmall" className="text-slate-400">
                {t('card.suggested')}
              </Typography>
              <span className="bg-slate-400 w-1 h-1 rounded-full sm:hidden"></span>

              <Typography
                variant="extraSmall"
                className={cn(
                  'flex items-center gap-1',
                  // actionButton.variant === 'destructive' && 'text-primary',
                  // actionButton.variant === 'outline' && 'text-primary',
                  // actionButton.variant === 'ghost' && ' text-gray-900 '
                )}
              >
                {actionButton.icon && <actionButton.icon className="h-3 w-3 hidden sm:block" />}
                {actionButton.text}
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Card footer */}
      <div className="flex items-center gap-2 px-5 py-3 bg-slate-50">
        <Typography variant="extraSmall" color="muted">
          {t('card.tapToManage')}
        </Typography>
      </div>
    </div>
  )
}
