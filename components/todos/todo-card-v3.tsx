'use client'

import type { TodoItem } from '@/lib/queries/todos-rpc'
import { cn } from '@/lib/utils'
import { migrateRecommendation } from '@/lib/utils/recommendation-migration'
import { Typography } from '../ui/typography'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { useCurrency } from '@/hooks/use-currency'
import { calculateTodoDateInfo, type ActionButtonConfig } from '@/lib/utils/todo-status'

interface TodoCardV3Props {
  todo: TodoItem
  currencySymbol?: string
  onClick?: () => void
}

export function TodoCardV3({
  todo,
  currencySymbol: providedCurrencySymbol,
  onClick,
}: TodoCardV3Props) {
  const t = useTranslations('todos')
  const defaultCurrencySymbol = useCurrency()
  const currencySymbol = providedCurrencySymbol ?? defaultCurrencySymbol

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
            variant: 'outline',
          }
        case 'dispose':
          return {
            text: t('actions.disposed'),
            variant: 'destructive',
          }
        case 'discount':
          if (todo.last_discount_percent != null && todo.last_discount_percent > 0) {
            return {
              text: t('actions.soldAtDiscount', {
                percent: todo.last_discount_percent,
              }),
              variant: 'outline',
            }
          }
          return {
            text: t('actions.discount'),
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
          variant: 'outline',
        }
      case 'dispose':
        return {
          text: t('actions.dispose'),
          variant: 'destructive',
        }
      case 'discount':
        return {
          text: t('actions.discount'),
          variant: 'outline',
        }
      default:
        return {
          text: t('actions.monitorStock'),
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

  // Get action label - "Suggested" for pending items, "Completed" for completed items
  const actionLabel = useMemo(() => {
    if (todo.completion_status === 'completed') {
      return t('card.completed')
    }
    return t('card.suggested')
  }, [todo.completion_status, t])

  // Calculate completion details for completed items
  const completionDetails = useMemo(() => {
    // const currentQty = todo.current_quantity ?? 0
    const lastActionType = todo.last_action_type
    const lastActionQty = todo.last_action_quantity ?? 0
    const totalSold = todo.total_sold_quantity ?? 0
    const unitPrice = todo.unit_price ?? 0
    const isCompleted = todo.completion_status === 'completed'

    if (!isCompleted) return null

    // Case 1: Completed with sales - show total sold and revenue
    if (totalSold > 0) {
      const actualSellingPrice = todo.current_selling_price ?? todo.selling_price ?? unitPrice
      const revenue = totalSold * actualSellingPrice
      return {
        label: t('card.soldUnits'),
        value: totalSold,
        secondaryLabel: t('card.revenue'),
        secondaryValue: `${currencySymbol}${revenue.toFixed(0)}`,
      }
    }

    // Case 2: Donate action
    if (lastActionType === 'donate' && lastActionQty > 0) {
      return {
        label: t('card.donatedAction'),
        value: lastActionQty,
        secondaryLabel: t('card.units'),
        secondaryValue: null,
      }
    }

    // Case 3: Dispose action
    if (lastActionType === 'dispose' && lastActionQty > 0) {
      return {
        label: t('card.disposedAction'),
        value: lastActionQty,
        secondaryLabel: t('card.units'),
        secondaryValue: null,
      }
    }

    return null
  }, [
    todo.completion_status,
    // todo.current_quantity,
    todo.last_action_type,
    todo.last_action_quantity,
    todo.total_sold_quantity,
    todo.unit_price,
    todo.current_selling_price,
    todo.selling_price,
    currencySymbol,
    t,
  ])

  // Get context-aware footer message based on expiration status
  // const footerMessage = useMemo(() => {
  //   if (todo.available_quantity === 0) {
  //     return t('card.tapToViewDetails')
  //   }
  //   if (isExpiring) {
  //     return t('card.tapToReview') // "Review & resolve"
  //   }
  //   if (isExpiringToday) {
  //     return t('card.tapToTakeAction') // "Take action"
  //   }
  //   // For items expiring in the future (including tomorrow, this week, etc.)
  //   return t('card.tapToViewDetails') // "View details"
  // }, [isExpiring, isExpiringToday, t, todo.available_quantity])

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
      className="flex gap-2 w-full flex-1 group"
    >
      {/* <div className="h-6 w-6 bg-card border-2 border-muted rounded-full sm:group-hover:border-primary/40 transition-all duration-400 mt-2" /> */}
      <div
        className={cn(
          'bg-card w-full flex flex-col gap-3 rounded-[14px] p-[18px] cursor-pointer transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]',
          'sm:group-hover:shadow-lg sm:group-hover:shadow-primary-400/50 sm:group-hover:-translate-y-0.5 transition-all duration-400 cursor-pointer overflow-hidden',
          'sm:hover:-translate-y-px sm:active:scale-[0.98]',
        )}
      >
        {/* Top Row: Status + Date */}
        <div className="flex justify-between items-center">
          {/* Status - LEFT side, primary scan element */}
          <div className="flex items-center gap-1.5">
            {isUrgent ? (
              <Typography variant="small" color="destructive" className=" ">
                {isExpiring
                  ? t('card.expiredStatus')
                  : isExpiringToday
                    ? t('card.expiresToday')
                    : isExpiringTomorrow
                      ? t('card.expiresTomorrow')
                      : t('card.daysLeft', { days: daysUntilExpiry })}
              </Typography>
            ) : (
              <Typography variant="extraSmall" color="muted" className=" ">
                {daysUntilExpiry}d until expiry
              </Typography>
            )}
          </div>

          {/* Date - RIGHT side */}
          <Typography variant="extraSmall" color="muted">
            {formattedDate}
          </Typography>
        </div>

        {/* Product Name */}
        <Typography variant="h4">{todo.product_name}</Typography>

        {/* Inline Meta Row */}
        <div className="flex items-center">
          {!isCompleted ? (
            <>
              <Typography variant="small" color="default">
                {stockData.currentQty} {t('card.units')}
              </Typography>
              <span className="mx-2 h-1 w-1 rounded-full bg-black/[0.2]"></span>
              <Typography variant="small" color="muted">
                {currencySymbol}
                {unitPrice.toFixed(2)}/{t('card.unit')}
              </Typography>
              <span className="mx-2 h-1 w-1 rounded-full bg-black/[0.2]"></span>
              <Typography variant="small" color="default">
                {currencySymbol}
                {valueAtRisk != null ? valueAtRisk.toFixed(2) : '0.00'} total
              </Typography>
            </>
          ) : (
            <div className="flex items-center">
              {completionDetails ? (
                <>
                  <Typography variant="small" color="default">
                    {completionDetails.value} {completionDetails.label}
                  </Typography>
                  {completionDetails.secondaryValue && (
                    <>
                      <span className="mx-2 h-1 w-1 rounded-full bg-black/[0.2]"></span>
                      <Typography variant="small" color="default">
                        {completionDetails.secondaryValue} {completionDetails.secondaryLabel}
                      </Typography>
                    </>
                  )}
                </>
              ) : (
                <Typography variant="small" color="default">
                  {t('card.completed')}
                </Typography>
              )}
            </div>
          )}
        </div>

        {/* Suggestion Row - Border Only */}
        <div className="pt-3.5 mt-auto border-t border-muted/60 flex justify-between items-center">
          <Typography variant="small" color="muted">
            {actionLabel}
          </Typography>
          <Typography className=" text-secondary" variant="small">
            {actionButton.text}
          </Typography>
        </div>
      </div>
    </div>
  )
}
