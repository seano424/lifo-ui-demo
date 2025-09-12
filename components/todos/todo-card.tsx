'use client'

import { Calendar, Package, PenLine } from 'lucide-react'
import type { TodoItem } from '@/components/todos/todos-filtered-list'
import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

interface TodoCardProps {
  todo: TodoItem
}

export function TodoCard({ todo }: TodoCardProps) {
  const handleCardClick = () => {
    // TODO: Open bottom sheet with todo details and actions
    // Placeholder for future bottom sheet integration
  }

  // Format expiry date
  const expiryDate = new Date(todo.expiry_date)
  const isExpiringSoon =
    expiryDate <= new Date(Date.now() + 24 * 60 * 60 * 1000) // within 24 hours
  const isExpired = expiryDate < new Date()
  const isExpiringToday =
    expiryDate.toDateString() === new Date().toDateString()

  // Get urgency colors and icons
  const getUrgencyConfig = (urgency: TodoItem['urgency']) => {
    switch (urgency) {
      case 'critical':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'group-hover:bg-red-500 border-red-600',
          badge: 'bg-red-200 text-red-800 border-red-500',
          badgeVariant: 'destructive' as const,
        }
      case 'high':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'group-hover:bg-red-50 border-red-500',
          badge: 'bg-red-100 text-red-800 border-red-500',
          badgeVariant: 'destructive' as const,
        }
      case 'medium':
        return {
          color: 'bg-primary-500',
          textColor: 'text-primary-700',
          bgColor: 'group-hover:bg-primary-50 border-primary-500',
          badge: 'bg-primary-100 text-primary-800 border-primary-500',
          badgeVariant: 'primary' as const,
        }
      case 'low':
        return {
          color: 'bg-secondary-500',
          textColor: 'text-secondary-700',
          bgColor: 'group-hover:bg-secondary-50 border-secondary-500',
          badge: 'bg-secondary-100 text-secondary-800 border-secondary-500',
          badgeVariant: 'secondary' as const,
        }
      case 'maintain':
        return {
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          bgColor: 'group-hover:bg-blue-50 border-blue-500',
          badge: 'bg-blue-100 text-blue-800 border-blue-500',
          badgeVariant: 'secondary' as const,
        }
      default:
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'group-hover:bg-gray-50 border-gray-200',
          badge: 'bg-gray-100 text-gray-800 border-gray-200',
          badgeVariant: 'secondary' as const,
        }
    }
  }

  const urgencyConfig = getUrgencyConfig(todo.urgency)

  // Format recommendation for display
  const formatRecommendation = (recommendation: string) => {
    return recommendation
      .replace('_', ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <div
      className={cn('cursor-pointer transition-all duration-1000', 'border-b')}
      onClick={handleCardClick}
    >
      <div className="flex gap-3 px-4 pb-6 items-start relative group">
        <Badge
          variant="outline"
          className={cn(
            'border-2 rounded-full cursor-pointer',
            'h-6 w-6 p-0 bg-brand-white transition-all duration-200',
            urgencyConfig.bgColor
          )}
        ></Badge>

        <div className="flex flex-col min-w-0 flex-1 gap-3">
          <div className=" flex flex-col gap-1">
            <Typography
              variant="h4"
              className="line-clamp-1"
            >
              {todo.product_name}
            </Typography>

            <div className="flex-1">
              <Typography className="flex gap-1 w-8/12">
                <span className="flex-shrink-0">Suggestion</span>
                <span className="truncate lowercase">
                  {formatRecommendation(todo.recommendation)} • {todo.reason}
                </span>
              </Typography>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-1">
            <Typography
              variant="muted"
              className="flex items-center justify-between "
            >
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Expires: {expiryDate.toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {todo.current_quantity} left
              </span>
            </Typography>

            <div className="flex items-center justify-between">
              {todo.discount_percent && (
                <Badge variant={urgencyConfig.badgeVariant}>
                  Suggested discount: {todo.discount_percent}%
                </Badge>
              )}

              {isExpiringToday ? (
                <Badge variant="destructive">expires today</Badge>
              ) : isExpired ? (
                <Badge variant="destructive">expired</Badge>
              ) : isExpiringSoon ? (
                <Badge variant="primary">expiring soon</Badge>
              ) : null}
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
    </div>
  )
}
