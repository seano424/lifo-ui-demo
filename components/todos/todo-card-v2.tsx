'use client'

import type { TodoItem } from '@/lib/queries/todos-rpc'
import { cn } from '@/lib/utils'
import { migrateRecommendation } from '@/lib/utils/recommendation-migration'
import { ChevronRight, TrendingDown, Calendar, PackageIcon } from 'lucide-react'
import { Typography } from '../ui/typography'
import { addDays, differenceInDays, format, isBefore, isToday, startOfDay } from 'date-fns'
import { useTranslations } from 'next-intl'
import { Button } from '../ui/button'

interface TodoCardV2Props {
  todo: TodoItem
  onClick?: () => void
}

// Status badge colors
const STATUS_COLORS = {
  expired: 'text-red-400',
  today: 'text-primary',
  tomorrow: 'text-blue-500',
  thisWeek: 'text-foreground-muted',
  default: 'text-foreground-muted',
} as const

export function TodoCardV2({ todo, onClick }: TodoCardV2Props) {
  const t = useTranslations('todos')

  // Date calculations
  const expiryDate = todo.expiry_date ? new Date(todo.expiry_date) : new Date()
  const today = new Date()
  const expiryStartOfDay = startOfDay(expiryDate)
  const todayStartOfDay = startOfDay(today)

  const isExpiring = isBefore(expiryStartOfDay, todayStartOfDay)
  const isExpiringToday = isToday(expiryDate)
  const isExpiringTomorrow =
    !isExpiring && !isExpiringToday && isBefore(expiryStartOfDay, addDays(todayStartOfDay, 2))

  const daysUntilExpiry = differenceInDays(expiryStartOfDay, todayStartOfDay)

  // Get status badge text and color
  const getStatusBadge = () => {
    if (isExpiring) {
      return {
        text: t('card.expiredStatus') || 'Expired',
        color: STATUS_COLORS.expired,
      }
    }
    if (isExpiringToday) {
      return {
        text: t('card.expiresToday') || 'Today',
        color: STATUS_COLORS.today,
      }
    }
    if (isExpiringTomorrow) {
      return {
        text: t('card.expiresTomorrow') || 'Tomorrow',
        color: STATUS_COLORS.tomorrow,
      }
    }
    if (daysUntilExpiry <= 7) {
      return {
        text: `${daysUntilExpiry}D Left`,
        color: STATUS_COLORS.thisWeek,
      }
    }
    return null
  }

  const statusBadge = getStatusBadge()

  // Get action button configuration
  const getActionButton = () => {
    const standardRecommendation = isExpiring
      ? 'dispose'
      : migrateRecommendation(todo.ai_recommendation)

    // Expired items
    if (isExpiring) {
      return {
        text: t('actions.dispose') || 'Dispose',
        variant: 'destructive' as const,
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
        variant: 'outline' as const,
      }
    }

    // Default action based on recommendation
    switch (standardRecommendation) {
      case 'donate':
        return {
          text: t('actions.donate') || 'Donate',
          variant: 'outline' as const,
        }
      case 'dispose':
        return {
          text: t('actions.dispose') || 'Dispose',
          variant: 'destructive' as const,
        }
      case 'discount':
        return {
          text: t('actions.discount') || 'Discount',
          variant: 'outline' as const,
        }
      default:
        return {
          text: t('actions.monitorStock') || 'Monitor Stock',
          variant: 'ghost' as const,
        }
    }
  }

  const actionButton = getActionButton()

  // Calculate value at risk
  const valueAtRisk =
    todo.current_quantity && todo.unit_price ? todo.current_quantity * todo.unit_price : null

  const handleCardClick = () => {
    onClick?.()
  }

  return (
    <Button
      onClick={handleCardClick}
      variant="ghost"
      className="w-full text-left flex items-center justify-between shadow-xs shadow-primary-50 border border-gray-100 rounded-2xl hover:bg-white group px-4 py-6 md:hover:shadow-lg md:hover:shadow-primary-400/50 md:hover:-translate-y-0.5 transition-all duration-400"
    >
      {/* Card content */}
      <div className="flex items-center gap-3 justify-between w-full">
        {/* Left section: Product info */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Product name + status badge */}
          <div className="flex items-center gap-4 flex-wrap">
            <Typography className="font-heading" variant="h4">
              {todo.product_name}
            </Typography>

            <Typography
              variant="small"
              className={cn(
                statusBadge ? statusBadge.color : 'text-gray-600',
                'flex items-center gap-1',
              )}
            >
              <Calendar />
              {statusBadge?.text}
              {!statusBadge && format(expiryDate, 'MMM dd yyyy')}
            </Typography>
          </div>

          {/* Units + value at risk or expiry date */}
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Typography variant="small" className="flex items-center gap-1">
              <PackageIcon className="h-3 w-3 text-gray-400" />
              <span>{todo.current_quantity ?? 0} units</span>
            </Typography>
            {valueAtRisk && (
              <div className="flex items-center gap-1">
                <TrendingDown
                  className={cn(
                    'h-3 w-3 text-gray-400',
                    // statusBadge ? statusBadge.color : 'text-gray-600'
                  )}
                />
                <Typography variant="small" className="text-gray-600">
                  €{valueAtRisk.toFixed(0)}
                </Typography>
              </div>
            )}
          </div>
        </div>

        {/* Right section: Action button + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Typography
            variant="extraSmall"
            className={cn(
              'px-3 py-1.5 rounded-lg transition-colors',
              actionButton.variant === 'destructive' && 'bg-red-50 text-red-500',
              actionButton.variant === 'outline' && 'bg-primary-50 text-primary-900',
              actionButton.variant === 'ghost' && 'bg-gray-50 text-gray-900 ',
            )}
          >
            {actionButton.text}
          </Typography>
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>
      </div>
    </Button>
  )
}
