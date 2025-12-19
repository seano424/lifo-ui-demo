'use client'

import type { TodoItem } from '@/lib/queries/todos-rpc'
import { cn } from '@/lib/utils'
import { migrateRecommendation } from '@/lib/utils/recommendation-migration'
import { HandHeartIcon, PercentIcon, Trash2Icon, EyeIcon } from 'lucide-react'
import { Typography } from '../ui/typography'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { calculateTodoDateInfo, type ActionButtonConfig } from '@/lib/utils/todo-status'

interface TodoCardV3Props {
  todo: TodoItem
  currencySymbol?: string
  onClick?: () => void
}

export function TodoCardV3({ todo, currencySymbol = '€', onClick }: TodoCardV3Props) {
  const t = useTranslations('todos')

  // Validate required fields
  if (!todo) {
    throw new Error('TodoCardV3: todo prop is required')
  }

  // Memoize date calculations for performance
  const dateInfo = useMemo(() => calculateTodoDateInfo(todo.expiry_date), [todo.expiry_date])
  const { expiryDate, isExpiring, isExpiringToday, isExpiringTomorrow, daysUntilExpiry } = dateInfo

  // Get action button configuration (used as category badge)
  const actionButton = useMemo((): ActionButtonConfig => {
    // For completed items, show what was actually done (past tense)
    if (todo.completion_status === 'completed' && todo.last_action_type) {
      switch (todo.last_action_type) {
        case 'sold':
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

  // Calculate value at risk
  const valueAtRisk =
    todo.current_quantity != null && todo.unit_price != null
      ? todo.current_quantity * todo.unit_price
      : null

  // Calculate stock percentage for progress bar
  const stockData = useMemo(() => {
    const currentQty = todo.current_quantity ?? 0
    const totalSold = todo.total_sold_quantity ?? 0
    const lastActionQty = todo.last_action_quantity ?? 0
    const lastActionType = todo.last_action_type

    // Calculate initial quantity (current + sold + other actions)
    let initialQty = currentQty

    if (totalSold > 0) {
      initialQty = currentQty + totalSold
    } else if (lastActionType === 'donate' || lastActionType === 'dispose') {
      initialQty = currentQty + lastActionQty
    }

    const percentage = initialQty > 0 ? (currentQty / initialQty) * 100 : 100

    return {
      currentQty,
      initialQty,
      percentage: Math.round(percentage),
    }
  }, [
    todo.current_quantity,
    todo.total_sold_quantity,
    todo.last_action_quantity,
    todo.last_action_type,
  ])

  // Determine if this is an urgent item (for expiry indicator styling)
  const isUrgent = useMemo(() => {
    return isExpiring || isExpiringToday || isExpiringTomorrow || daysUntilExpiry <= 7
  }, [isExpiring, isExpiringToday, isExpiringTomorrow, daysUntilExpiry])

  // Format expiry date for display
  const formattedDate = useMemo(() => {
    if (todo.completion_status === 'completed') {
      // For completed items, you might want to show completion date if available
      // For now, showing expiry date
      return format(expiryDate, 'MMM d, yyyy')
    }
    return format(expiryDate, 'MMM d, yyyy')
  }, [expiryDate, todo.completion_status])

  const handleCardClick = () => {
    onClick?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleCardClick()
    }
  }

  const isCompleted = todo.completion_status === 'completed'
  const unitPrice = todo.unit_price ?? 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      aria-label={`Todo item: ${todo.product_name}`}
      className={cn(
        'bg-card rounded-[14px] p-[18px] cursor-pointer transition-all',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]',
        'hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_8px_16px_rgba(0,0,0,0.04)]',
        'hover:-translate-y-px active:scale-[0.98]',
        isCompleted && 'opacity-60',
      )}
    >
      {/* Top Row: Category Badge + Date */}
      <div className="flex justify-between items-center mb-3">
        <Typography
          variant="extraSmall"
          className="px-[11px] py-[5px] rounded-md bg-black/[0.02] text-muted-foreground"
        >
          {actionButton.text && `${t('card.suggestion')}: ${actionButton.text}`}
        </Typography>
        <Typography variant="extraSmall" className="text-muted-foreground">
          {formattedDate}
        </Typography>
      </div>

      {/* Product Name */}
      <Typography
        variant="p"
        className={cn(
          'font-semibold text-[17px] tracking-tight mb-4',
          isCompleted && 'line-through',
        )}
      >
        {todo.product_name}
      </Typography>

      {/* Stock Progress - only show if not completed */}
      {!isCompleted && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] font-semibold text-foreground">
              {stockData.currentQty} {t('card.units')}
            </span>
            {stockData.initialQty > stockData.currentQty && (
              <span className="text-xs text-muted-foreground">{stockData.percentage}% stocked</span>
            )}
          </div>
          {/* Progress Bar - only show if there's been activity */}
          {stockData.initialQty > stockData.currentQty && (
            <div className="h-1 bg-black/[0.06] rounded-sm overflow-hidden">
              <div
                className="h-full bg-foreground rounded-sm transition-all duration-500"
                style={{ width: `${stockData.percentage}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Price Section */}
      <div className="flex items-center justify-between p-[14px_16px] bg-black/[0.02] rounded-[10px]">
        <div className="flex items-center gap-6">
          {/* Unit Price */}
          <div>
            <div className="text-[11px] font-medium text-muted-foreground mb-[3px]">
              {t('card.unitPrice')}
            </div>
            <div className="text-[15px] font-semibold text-foreground">
              {currencySymbol}
              {unitPrice.toFixed(2)}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-black/[0.06]" />

          {/* Total Value */}
          <div>
            <div className="text-[11px] font-medium text-muted-foreground mb-[3px]">
              {t('card.totalValue')}
            </div>
            <div className="text-[15px] font-bold text-foreground">
              {currencySymbol}
              {valueAtRisk != null ? valueAtRisk.toFixed(2) : '0.00'}
            </div>
          </div>
        </div>

        {/* Expiry Indicator */}
        {!isCompleted &&
          (isUrgent ? (
            <div className="px-[11px] py-[5px] rounded-md bg-destructive/10">
              <span className="text-xs font-semibold text-destructive">
                {isExpiring
                  ? t('card.expiredStatus')
                  : t('card.daysLeft', { days: daysUntilExpiry })}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">{daysUntilExpiry}d</span>
          ))}
      </div>
    </div>
  )
}
