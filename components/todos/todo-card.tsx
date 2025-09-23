'use client'

import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import type { TodoItem } from '@/lib/queries/todos-rpc'

import { cn } from '@/lib/utils'
import { formatRecommendation } from '@/lib/utils/todo-transformers'
import { Calendar, Package, PenLine, CheckIcon } from 'lucide-react'
import { startOfDay, isToday, differenceInDays, addDays, isBefore } from 'date-fns'

interface TodoCardProps {
  todo: TodoItem
  onClick?: () => void
}

// Move urgency config outside component for better performance
const URGENCY_CONFIG = {
  critical: {
    color: 'bg-primary-500',
    textColor: 'text-primary-700',
    bgColor: 'group-hover:bg-primary-500 border-primary-600',
    badge: 'bg-primary-200 text-primary-800 border-primary-500',
    badgeVariant: 'default' as const,
  },
  high: {
    color: 'bg-primary-500',
    textColor: 'text-primary-700',
    bgColor: 'group-hover:bg-primary-50 border-primary-500',
    badge: 'bg-primary-100 text-primary-800 border-primary-500',
    badgeVariant: 'default' as const,
  },
  medium: {
    color: 'bg-primary-500',
    textColor: 'text-primary-700',
    bgColor: 'group-hover:bg-primary-50 border-primary-500',
    badge: 'bg-primary-100 text-primary-800 border-primary-500',
    badgeVariant: 'primary' as const,
  },
  low: {
    color: 'bg-secondary-500',
    textColor: 'text-secondary-700',
    bgColor: 'group-hover:bg-secondary-50 border-secondary-500',
    badge: 'bg-secondary-100 text-secondary-800 border-secondary-500',
    badgeVariant: 'secondary' as const,
  },
  none: {
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    bgColor: 'group-hover:bg-gray-50 border-gray-200',
    badge: 'bg-gray-100 text-gray-800 border-gray-200',
    badgeVariant: 'secondary' as const,
  },
  default: {
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    bgColor: 'group-hover:bg-gray-50 border-gray-200',
    badge: 'bg-gray-100 text-gray-800 border-gray-200',
    badgeVariant: 'secondary' as const,
  },
} as const

export function TodoCard({ todo, onClick }: TodoCardProps) {
  const handleCardClick = () => {
    onClick?.()
  }

  // Format expiry date with reliable timezone handling using date-fns
  const expiryDate = new Date(todo.expiry_date)
  const today = new Date()

  // Use date-fns for reliable date comparisons
  const expiryStartOfDay = startOfDay(expiryDate)
  const todayStartOfDay = startOfDay(today)
  const tomorrowStartOfDay = addDays(todayStartOfDay, 1)

  const isExpiringSoon = isBefore(expiryStartOfDay, tomorrowStartOfDay) || isToday(expiryDate)
  const isExpiring = isBefore(expiryStartOfDay, todayStartOfDay)
  const isExpiringToday = isToday(expiryDate)

  // Calculate days since expiry for expiring items using date-fns
  const getExpiringText = () => {
    if (!isExpiring) return ''

    const diffDays = differenceInDays(todayStartOfDay, expiryStartOfDay)

    if (diffDays === 1) return 'Expiring yesterday'
    return `Expiring ${diffDays} days ago`
  }

  // Simple lookup for urgency configuration - no memoization needed since config is static
  const urgencyConfig = URGENCY_CONFIG[todo.urgency_level] || URGENCY_CONFIG.default

  const wasDiscounted = todo.last_discount_percent != null && todo.last_discount_percent > 0
  const wasDonated = todo.last_action_type === 'donate'
  const wasDisposed = todo.last_action_type === 'dispose'
  const isCompleted = todo.completion_status === 'completed'
  const lastActionType = todo.last_action_type
  const completionDate = todo.last_action_time ? new Date(todo.last_action_time) : null

  const getCompletionDateText = () => {
    switch (lastActionType) {
      case 'donate':
        return `Donated on ${completionDate?.toLocaleDateString()}`
      case 'dispose':
        return `Disposed on ${completionDate?.toLocaleDateString()}`
      case 'sold':
        return `Completed on ${completionDate?.toLocaleDateString()}`
      default:
        return `Completed on ${completionDate?.toLocaleDateString()}`
    }
  }

  return (
    <button
      type="button"
      className={cn('cursor-pointer transition-all duration-1000', 'border-b flex flex-col')}
      onClick={handleCardClick}
    >
      <div className="flex gap-3 px-4 pb-6 items-start relative group">
        <Badge
          variant="outline"
          className={cn(
            'border-2 rounded-full cursor-pointer',
            'h-6 w-6 p-0 bg-brand-white dark:bg-brand-dark transition-all duration-200 items-center justify-center',
            urgencyConfig.bgColor,
          )}
        >
          {isCompleted && (
            <CheckIcon className="h-4 w-4 text-primary dark:text-secondary-400 stroke-3" />
          )}
        </Badge>

        <div className="flex flex-col min-w-0 flex-1 gap-4">
          <div className="flex flex-col gap-2 items-start">
            <Typography variant="h4">{todo.product_name}</Typography>

            <div className="flex-1 w-full">
              <Typography className="flex gap-1 sm:w-8/12">
                <span className="flex-shrink-0">Suggestion</span>
                <span className="truncate lowercase">
                  {formatRecommendation(todo.ai_recommendation || 'No recommendation')}
                </span>
              </Typography>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-2">
            <Typography
              variant="muted"
              className="flex sm:items-center sm:justify-between flex-col-reverse sm:flex-row gap-2"
            >
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {expiryDate.toLocaleDateString()}
              </span>

              {!isCompleted && (
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {todo.current_quantity} left
                </span>
              )}

              {isCompleted && lastActionType === 'sold' && (
                <Typography variant="small" className="flex items-center gap-1">
                  🎉 All sold!
                </Typography>
              )}

              {isCompleted && wasDonated && (
                <Typography variant="small" className="flex items-center gap-1">
                  🎁 Donated!
                </Typography>
              )}

              {isCompleted && wasDisposed && (
                <Typography variant="small" className="flex items-center gap-1">
                  🗑️ All disposed!
                </Typography>
              )}
            </Typography>

            <div className="flex flex-wrap gap-2 items-center justify-between">
              {isCompleted && !wasDisposed && <Badge variant={'primary'}>Completed</Badge>}

              {isCompleted && wasDisposed && <Badge variant={'default'}>Disposed</Badge>}

              {todo.last_discount_percent != null &&
                todo.last_discount_percent > 0 &&
                !wasDiscounted &&
                !isCompleted && (
                  <Badge variant={urgencyConfig.badgeVariant}>
                    Suggested discount: {todo.last_discount_percent}%
                  </Badge>
                )}

              {wasDiscounted && (
                <Badge variant={urgencyConfig.badgeVariant}>
                  Currently discounted: {todo.last_discount_percent}%
                </Badge>
              )}

              {(todo.last_discount_percent == null || todo.last_discount_percent === 0) &&
                !isCompleted && (
                  <Badge variant={urgencyConfig.badgeVariant}>Suggestion: Healthy & Maintain</Badge>
                )}

              {isCompleted ? (
                <Badge variant="primary">{getCompletionDateText()}</Badge>
              ) : isExpiringToday ? (
                <Badge variant="default">Expires today</Badge>
              ) : isExpiring ? (
                <Badge variant="default">{getExpiringText()}</Badge>
              ) : isExpiringSoon ? (
                <Badge variant="primary">Expiring soon</Badge>
              ) : wasDonated ? (
                <Badge className="hidden" variant="primary">
                  Donated
                </Badge>
              ) : (
                <Badge variant="primary">Active & healthy</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="absolute right-4 top-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-muted rounded p-1.5 group/edit">
          <PenLine className="h-4 w-4" />
          <div className="absolute right-2 text-xs w-min text-nowrap bg-brand-dark font-medium text-white rounded-lg py-1 px-2.5 -top-full opacity-0 group-hover/edit:opacity-100 transition-all duration-1000 delay-300">
            Edit todo
          </div>
        </div>
      </div>
    </button>
  )
}
