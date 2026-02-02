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
import { useCurrency } from '@/hooks/use-currency'
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
  expired: 'text-destructive',
  today: 'text-primary',
  tomorrow: 'text-secondary',
  thisWeek: 'text-secondary',
  default: 'text-foreground-muted',
} as const

export function TodoCardV2({ todo, onClick }: TodoCardV2Props) {
  const t = useTranslations('todos')
  const currencySymbol = useCurrency()

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
    // For completed items, show what was actually done (past tense)
    if (todo.completion_status === 'completed' && todo.last_action_type) {
      switch (todo.last_action_type) {
        case 'sold':
          // Check if sold with a discount
          if (todo.last_discount_percent != null && todo.last_discount_percent > 0) {
            return {
              text: t('actions.soldAtDiscount', {
                percent: todo.last_discount_percent,
              }),
              variant: 'outline',
            }
          }
          return {
            text: t('actions.sold'),
            variant: 'outline',
          }
        case 'donate':
          return {
            text: t('actions.donated'),
            icon: HandHeartIcon,
            variant: 'outline',
          }
        case 'dispose':
          return {
            text: t('actions.disposed'),
            icon: Trash2Icon,
            variant: 'destructive',
          }
        case 'discount':
          // Show the actual discount percentage if available
          if (todo.last_discount_percent != null && todo.last_discount_percent > 0) {
            return {
              text: t('actions.soldAtDiscount', {
                percent: todo.last_discount_percent,
              }),
              icon: PercentIcon,
              variant: 'outline',
            }
          }
          return {
            text: t('actions.discount'),
            icon: PercentIcon,
            variant: 'outline',
          }
      }
    }

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
  }, [
    todo.completion_status,
    todo.last_action_type,
    todo.last_discount_percent,
    isExpiring,
    todo.ai_recommendation,
    t,
  ])

  // Calculate value at risk - fixed null safety (use != null instead of &&)
  const valueAtRisk =
    todo.current_quantity != null && todo.unit_price != null
      ? todo.current_quantity * todo.unit_price
      : null

  // Get context-aware footer message based on expiration status
  const footerMessage = useMemo(() => {
    if (todo.available_quantity === 0) {
      return t('card.tapToViewDetails')
    }
    if (isExpiring) {
      return t('card.tapToReview') // "Review & resolve"
    }
    if (isExpiringToday) {
      return t('card.tapToTakeAction') // "Take action"
    }
    // For items expiring in the future (including tomorrow, this week, etc.)
    return t('card.tapToViewDetails') // "View details"
  }, [isExpiring, isExpiringToday, t, todo.available_quantity])

  // Get action label - "Suggested" for pending items, "Completed" for completed items
  const actionLabel = useMemo(() => {
    if (todo.completion_status === 'completed') {
      return t('card.completed')
    }
    return t('card.suggested')
  }, [todo.completion_status, t])

  // Get border classes based on todo state - memoized for performance
  // const borderClasses = useMemo(() => {
  //   // No stock - gray border with minimal styling
  //   if (todo.available_quantity === 0) {
  //     return 'border-gray-200 border-l sm:hover:shadow-gray-400/50'
  //   }

  //   // Expired - red accent with shadow
  //   if (isExpiring) {
  //     return 'border-destructive sm:hover:shadow-destructive/50 border-l-8 border-y-gray-200 border-r-gray-200'
  //   }

  //   // Critical/high urgency - primary accent
  //   if (todo.urgency_level === 'critical' || todo.urgency_level === 'high') {
  //     return 'border-primary-500 border-l-8 border-y-gray-200 border-r-gray-200'
  //   }

  //   // Expiring very soon (1-2 days) - primary accent
  //   if (!isExpiring && daysUntilExpiry <= 2) {
  //     return 'border-primary-500 border-l-8 border-y-gray-200 border-r-gray-200'
  //   }

  //   // Default - gray border
  //   return 'border-gray-200 border-l sm:hover:shadow-gray-400/50'
  // }, [todo.available_quantity, todo.urgency_level, isExpiring, daysUntilExpiry])

  // Calculate units summary with action details - memoized for performance
  const unitsSummary = useMemo(() => {
    const currentQty = todo.current_quantity ?? 0
    const lastActionType = todo.last_action_type
    const lastActionQty = todo.last_action_quantity ?? 0
    const discountPercent = todo.last_discount_percent
    const totalDiscounted = todo.total_discounted_quantity ?? 0
    const totalSold = todo.total_sold_quantity ?? 0
    const unitPrice = todo.unit_price ?? 0
    const isCompleted = todo.completion_status === 'completed'

    // Case 1: Completed with sales - show total sold and revenue
    if (isCompleted && totalSold > 0) {
      // Use actual selling price (current_selling_price if discounted, otherwise selling_price or unit_price)
      const actualSellingPrice = todo.current_selling_price ?? todo.selling_price ?? unitPrice
      const revenue = totalSold * actualSellingPrice
      return `${totalSold} ${t('card.soldUnits')} • ${currencySymbol}${revenue.toFixed(0)} ${t('card.revenue')}`
    }

    // Case 2: In-progress sales - show remaining and sold with revenue
    if (totalSold > 0 && currentQty > 0) {
      // Use actual selling price instead of calculating with discount
      const actualSellingPrice = todo.current_selling_price ?? todo.selling_price ?? unitPrice
      const revenue = totalSold * actualSellingPrice
      return `${currentQty} ${t('card.remaining')} • ${totalSold} ${t('card.soldUnits')} (${currencySymbol}${revenue.toFixed(0)})`
    }

    // Case 3: Donate or Dispose action
    if ((lastActionType === 'donate' || lastActionType === 'dispose') && lastActionQty > 0) {
      const actionLabel =
        lastActionType === 'donate' ? t('card.donatedAction') : t('card.disposedAction')
      return `${currentQty} ${t('card.remaining')} • ${lastActionQty} ${actionLabel}`
    }

    // Case 4: Discount applied (but not sold yet)
    if (lastActionType === 'discount' && discountPercent != null && discountPercent > 0) {
      // Check if discount is partial or full
      if (totalDiscounted > 0 && totalDiscounted < currentQty) {
        return `${currentQty} ${t('card.units')} • ${discountPercent}% ${t('card.discountAppliedToUnits', { count: totalDiscounted })}`
      }
      return `${currentQty} ${t('card.units')} • ${discountPercent}% ${t('card.discountApplied')}`
    }

    // Case 5: No actions yet - show value with unit price
    if (valueAtRisk != null && unitPrice > 0) {
      return `${currentQty} ${t('card.units')} • ${currencySymbol}${unitPrice.toFixed(2)}/${t('card.unit')} • ${currencySymbol}${valueAtRisk.toFixed(0)} ${t('card.total')}`
    }

    // Fallback: just quantity
    return `${currentQty} ${t('card.units')}`
  }, [todo, t, valueAtRisk, currencySymbol])

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
      className={cn(
        'flex flex-col gap-2 shadow-xs shadow-primary-50 border border-gray-100 rounded-2xl bg-white sm:hover:shadow-lg sm:hover:shadow-primary-400/50 sm:hover:-translate-y-0.5 transition-all duration-400 cursor-pointer overflow-hidden',
        // borderClasses,
      )}
    >
      <div className={cn('w-full text-left flex items-center justify-between group px-4 py-6')}>
        {/* Card content */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between w-full items-stretch">
          {/* Left section: Product info */}
          <div className="flex flex-col gap-4">
            {/* Product name + status badge */}
            <div className="flex gap-2 lg:gap-4 flex-wrap flex-col-reverse lg:flex-row">
              <Typography className="" variant="h4">
                {todo.product_name}
              </Typography>

              <Typography
                variant="small"
                className={cn(
                  statusBadge && todo.available_quantity != null && todo.available_quantity > 0
                    ? statusBadge.color
                    : 'text-foreground',
                  'flex items-center gap-1 text-xs sm:text-sm',
                )}
              >
                <Calendar className="h-3 w-3" />
                {statusBadge?.text}
                {!statusBadge && format(expiryDate, 'MMM dd yyyy')}
              </Typography>
            </div>

            {/* Units + action summary */}
            <div className="flex items-center gap-1 text-sm text-foreground">
              <Typography variant="small" className="flex items-center gap-1">
                <PackageIcon className="h-4 w-4 text-foreground" />
                <span>{unitsSummary}</span>
              </Typography>
            </div>
          </div>

          {/* Right section: Action button + chevron */}
          <div className="flex sm:flex-col sm:items-end items-center gap-1">
            <Typography variant="small" className="text-slate-400 text-xs sm:text-sm">
              {actionLabel}
            </Typography>
            <span className="bg-slate-400 w-1 h-1 rounded-full sm:hidden"></span>

            <Typography variant="extraSmall" className={cn('flex items-center gap-1')}>
              {actionButton.icon && <actionButton.icon className="h-3 w-3 hidden sm:block" />}
              {actionButton.text}
            </Typography>
          </div>
        </div>
      </div>

      {/* Card footer */}
      <div className="flex items-center gap-2 px-5 py-3 bg-slate-50">
        <Typography variant="extraSmall" color="muted">
          {footerMessage}
        </Typography>
      </div>
    </div>
  )
}
