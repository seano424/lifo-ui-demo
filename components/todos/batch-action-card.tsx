'use client'

import { Calendar, MapPin, Package, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { BatchActionWithDetails } from '@/hooks/use-scoring-analytics'
import { cn } from '@/lib/utils'

interface BatchActionCardProps {
  action: BatchActionWithDetails
}

export function BatchActionCard({ action }: BatchActionCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleCardClick = () => {
    // TODO: Open bottom sheet with action details
    // Placeholder for future bottom sheet integration
  }

  // Format action date
  const actionDate = new Date(action.action_date || '')
  const isRecent = actionDate >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // within 7 days

  // Get action type colors and labels
  const getActionConfig = (actionType: string) => {
    switch (actionType) {
      case 'discount':
        return {
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50 border-blue-200',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'Discounted',
          icon: TrendingDown,
        }
      case 'donate':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50 border-green-200',
          badge: 'bg-green-100 text-green-800 border-green-200',
          label: 'Donated',
          icon: Users,
        }
      case 'dispose':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50 border-red-200',
          badge: 'bg-red-100 text-red-800 border-red-200',
          label: 'Disposed',
          icon: Package,
        }
      case 'maintain':
        return {
          color: 'bg-purple-500',
          textColor: 'text-purple-700',
          bgColor: 'bg-purple-50 border-purple-200',
          badge: 'bg-purple-100 text-purple-800 border-purple-200',
          label: 'Maintained',
          icon: TrendingUp,
        }
      case 'ignored':
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50 border-gray-200',
          badge: 'bg-gray-100 text-gray-800 border-gray-200',
          label: 'Ignored',
          icon: Package,
        }
      default:
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50 border-gray-200',
          badge: 'bg-gray-100 text-gray-800 border-gray-200',
          label: actionType,
          icon: Package,
        }
    }
  }

  const actionConfig = getActionConfig(action.actual_action)
  const recommendedConfig = getActionConfig(action.recommended_action)
  const IconComponent = actionConfig.icon

  // Calculate effectiveness if we have price data
  const hasEffectivenessData = action.original_value && action.recovered_value
  const effectivenessPercent = hasEffectivenessData
    ? (action.recovered_value! / action.original_value!) * 100
    : null

  // Check if action matched recommendation
  const actionMatched = action.actual_action === action.recommended_action

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        actionConfig.bgColor,
        isHovered && 'transform scale-[1.02]',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Action indicator and status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', actionConfig.color)} />
            <Badge variant="outline" className={cn('text-xs', actionConfig.badge)}>
              <IconComponent className="h-3 w-3 mr-1" />
              {actionConfig.label.toUpperCase()}
            </Badge>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isRecent && (
              <Badge
                variant="outline"
                className="text-xs bg-amber-50 text-amber-700 border-amber-200"
              >
                RECENT
              </Badge>
            )}
            {!actionMatched && (
              <Badge
                variant="outline"
                className="text-xs bg-orange-50 text-orange-700 border-orange-200"
              >
                OFF-REC
              </Badge>
            )}
          </div>
        </div>

        {/* Product name and batch info */}
        <div className="mb-3">
          <h3 className="font-semibold text-sm mb-1 line-clamp-1">
            {action.product_name || 'Unknown Product'}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Package className="h-3 w-3" />
            {action.batch_number?.slice(0, 8) || action.batch_id.slice(0, 8)}...
          </p>
        </div>

        {/* Recommendation vs Action */}
        <div className="mb-3">
          <div className="flex items-center gap-2 text-xs mb-1">
            <span className="text-muted-foreground">Recommended:</span>
            <Badge variant="outline" className={cn('text-xs', recommendedConfig.badge)}>
              {recommendedConfig.label}
            </Badge>
          </div>
          {action.ai_score && (
            <p className="text-xs text-muted-foreground">
              AI Score: {(action.ai_score * 100).toFixed(0)}%
            </p>
          )}
        </div>

        {/* Action details */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {actionDate.toLocaleDateString()}
            </span>
            {action.quantity_affected && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Package className="h-3 w-3" />
                {action.quantity_affected} units
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            {action.location_code && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {action.location_code}
              </span>
            )}
            {hasEffectivenessData && effectivenessPercent !== null && (
              <span
                className={cn(
                  'font-medium',
                  effectivenessPercent >= 50 ? 'text-green-600' : 'text-orange-600',
                )}
              >
                {effectivenessPercent.toFixed(0)}% recovered
              </span>
            )}
          </div>

          {/* Financial details */}
          {(action.original_value || action.recovered_value) && (
            <div className="pt-2 border-t border-current/10 text-xs">
              <div className="flex justify-between">
                {action.original_value && (
                  <span className="text-muted-foreground">
                    Original: ${action.original_value.toFixed(2)}
                  </span>
                )}
                {action.recovered_value && (
                  <span className="font-medium text-green-700">
                    Recovered: ${action.recovered_value.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Donation details */}
          {action.actual_action === 'donate' &&
            (action.recipient_name || action.recipient_type) && (
              <div className="pt-2 border-t border-current/10">
                <p className="text-xs font-medium text-green-700">
                  {action.recipient_name && `Donated to: ${action.recipient_name}`}
                  {action.recipient_type &&
                    !action.recipient_name &&
                    `Donated to: ${action.recipient_type.replace('_', ' ')}`}
                </p>
              </div>
            )}

          {/* Notes */}
          {action.notes && (
            <div className="pt-2 border-t border-current/10">
              <p className="text-xs text-muted-foreground italic line-clamp-2">"{action.notes}"</p>
            </div>
          )}
        </div>

        {/* Hover state indicator */}
        {isHovered && (
          <div className="mt-3 pt-2 border-t border-current/10">
            <p className="text-xs text-muted-foreground italic">Click to view details →</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
