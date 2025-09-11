'use client'

import { Calendar, MapPin, Package } from 'lucide-react'
import { useState } from 'react'
import type { TodoItem } from '@/components/todos/todos-filtered-list'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TodoCardProps {
  todo: TodoItem
}

export function TodoCard({ todo }: TodoCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleCardClick = () => {
    // TODO: Open bottom sheet with todo details and actions
    console.log('Open bottom sheet for batch:', todo.batch_id)
  }

  // Format expiry date
  const expiryDate = new Date(todo.expiry_date)
  const isExpiringSoon = expiryDate <= new Date(Date.now() + 24 * 60 * 60 * 1000) // within 24 hours
  const isExpired = expiryDate < new Date()

  // Get urgency colors and icons
  const getUrgencyConfig = (urgency: TodoItem['urgency']) => {
    switch (urgency) {
      case 'critical':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50 border-red-200',
          badge: 'bg-red-100 text-red-800 border-red-200',
        }
      case 'high':
        return {
          color: 'bg-orange-500',
          textColor: 'text-orange-700',
          bgColor: 'bg-orange-50 border-orange-200',
          badge: 'bg-orange-100 text-orange-800 border-orange-200',
        }
      case 'medium':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50 border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        }
      case 'low':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50 border-green-200',
          badge: 'bg-green-100 text-green-800 border-green-200',
        }
      case 'maintain':
        return {
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50 border-blue-200',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
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
    return recommendation.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        urgencyConfig.bgColor,
        isHovered && 'transform scale-[1.02]',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Priority indicator */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', urgencyConfig.color)} />
            <Badge variant="outline" className={cn('text-xs', urgencyConfig.badge)}>
              {todo.urgency.toUpperCase()}
            </Badge>
          </div>
          {isExpired && (
            <Badge variant="destructive" className="text-xs">
              EXPIRED
            </Badge>
          )}
          {isExpiringSoon && !isExpired && (
            <Badge
              variant="outline"
              className="text-xs bg-amber-50 text-amber-700 border-amber-200"
            >
              TODAY
            </Badge>
          )}
        </div>

        {/* Product name and batch number */}
        <div className="mb-3">
          <h3 className="font-semibold text-sm mb-1 line-clamp-1">{todo.product_name}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Package className="h-3 w-3" />
            {todo.batch_id.slice(0, 8)}...
          </p>
        </div>

        {/* Recommendation */}
        <div className="mb-3">
          <p className={cn('text-sm font-medium mb-1', urgencyConfig.textColor)}>
            {formatRecommendation(todo.recommendation)}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2">{todo.reason}</p>
        </div>

        {/* Details */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Expires: {expiryDate.toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Package className="h-3 w-3" />
              {todo.current_quantity} left
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {todo.location_code}
            </span>
            {todo.potential_loss && (
              <span className="font-medium text-red-600">
                Loss: ${todo.potential_loss.toFixed(0)}
              </span>
            )}
          </div>

          {todo.discount_percent && (
            <div className="pt-2 border-t border-current/10">
              <span className="text-xs font-medium text-green-700">
                Suggested discount: {todo.discount_percent}%
              </span>
            </div>
          )}
        </div>

        {/* Hover state indicator */}
        {isHovered && (
          <div className="mt-3 pt-2 border-t border-current/10">
            <p className="text-xs text-muted-foreground italic">Click to view actions →</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
