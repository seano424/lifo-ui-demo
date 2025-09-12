'use client'

import { Calendar, Package } from 'lucide-react'
import { useState } from 'react'
import type { TodoItem } from '@/components/todos/todos-filtered-list'
import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

interface TodoCardProps {
  todo: TodoItem
}

export function TodoCard({ todo }: TodoCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleCardClick = () => {
    // TODO: Open bottom sheet with todo details and actions
    // Placeholder for future bottom sheet integration
  }

  // Format expiry date
  const expiryDate = new Date(todo.expiry_date)
  const isExpiringSoon =
    expiryDate <= new Date(Date.now() + 24 * 60 * 60 * 1000) // within 24 hours
  const isExpired = expiryDate < new Date()

  // Get urgency colors and icons
  const getUrgencyConfig = (urgency: TodoItem['urgency']) => {
    switch (urgency) {
      case 'critical':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50 border-red-500',
          badge: 'bg-red-100 text-red-800 border-red-500',
        }
      case 'high':
        return {
          color: 'bg-orange-500',
          textColor: 'text-orange-700',
          bgColor: 'bg-orange-50 border-orange-500',
          badge: 'bg-orange-100 text-orange-800 border-orange-500',
        }
      case 'medium':
        return {
          color: 'bg-primary-500',
          textColor: 'text-primary-700',
          bgColor: 'bg-primary-50 border-primary-500',
          badge: 'bg-primary-100 text-primary-800 border-primary-500',
        }
      case 'low':
        return {
          color: 'bg-secondary-500',
          textColor: 'text-secondary-700',
          bgColor: 'bg-secondary-50 border-secondary-500',
          badge: 'bg-secondary-100 text-secondary-800 border-secondary-500',
        }
      case 'maintain':
        return {
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50 border-blue-500',
          badge: 'bg-blue-100 text-blue-800 border-blue-500',
        }
      default:
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50 border-gray-200',
          badge: 'bg-gray-100 text-gray-800 border-gray-200',
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
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        'border-b',
        isHovered && 'transform scale-[1.02]'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div className="p-4 border flex flex-col gap-2">
        {/* Priority indicator */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'border-2 rounded-full',
                'h-8 w-8 p-0',
                urgencyConfig.bgColor
              )}
            >
              {/* {todo.urgency.toUpperCase()} */}
            </Badge>
          </div>
          {isExpired && <Badge variant="destructive">expired</Badge>}
          {isExpiringSoon && !isExpired && (
            <Badge variant="primary">expires today</Badge>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {/* Product name and batch number */}
          <div className="flex flex-col gap-1">
            <Typography
              variant="muted"
              className="flex items-center gap-1"
            >
              <Package className="h-3 w-3" />
              {todo.batch_id.slice(0, 8)}...
            </Typography>
            <Typography
              variant="h4"
              className="line-clamp-1"
            >
              {todo.product_name}
            </Typography>
          </div>

          {/* Recommendation */}
          <Typography
            variant="muted"
            className="flex gap-1 min-w-0"
          >
            <span className="flex-shrink-0">Suggestion</span>
            <span className="truncate lowercase">
              {formatRecommendation(todo.recommendation)} {todo.reason}
            </span>
          </Typography>

          {/* Details */}
          <div>
            <Typography
              variant="muted"
              className="flex items-center justify-between"
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

            {todo.discount_percent && (
              <Typography
                variant="small"
                className="text-secondary-700"
              >
                Suggested discount: {todo.discount_percent}%
              </Typography>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
