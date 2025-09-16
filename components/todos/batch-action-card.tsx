'use client'

import {
  Calendar,
  CheckIcon,
  MapPin,
  Package,
  PenLine,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import type { BatchActionWithDetails } from '@/hooks/use-scoring-analytics'
import { cn } from '@/lib/utils'

interface BatchActionCardProps {
  action: BatchActionWithDetails
}

export function BatchActionCard({ action }: BatchActionCardProps) {
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
          color: 'bg-secondary-500',
          textColor: 'text-secondary-700',
          bgColor: 'bg-secondary-50 border-secondary-500',
          badge: 'bg-secondary-100 text-secondary-800 border-secondary-500',
          badgeVariant: 'secondary' as const,
          label: 'Discounted',
          icon: TrendingDown,
        }
      case 'donate':
        return {
          color: 'bg-primary-500',
          textColor: 'text-primary-700',
          bgColor: 'bg-primary-50 border-primary-500',
          badge: 'bg-primary-100 text-primary-800 border-primary-500',
          badgeVariant: 'primary' as const,
          label: 'Donated',
          icon: Users,
        }
      case 'dispose':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50 border-red-500',
          badge: 'bg-red-100 text-red-800 border-red-500',
          badgeVariant: 'destructive' as const,
          label: 'Disposed',
          icon: Package,
        }
      case 'maintain':
        return {
          color: 'bg-secondary-500',
          textColor: 'text-secondary-700',
          bgColor: 'bg-secondary-50 border-secondary-500',
          badge: 'bg-secondary-100 text-secondary-800 border-secondary-500',
          badgeVariant: 'secondary' as const,
          label: 'Maintained',
          icon: TrendingUp,
        }
      case 'ignored':
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50 border-gray-200',
          badge: 'bg-gray-100 text-gray-800 border-gray-200',
          badgeVariant: 'gray' as const,
          label: 'Ignored',
          icon: Package,
        }
      default:
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50 border-gray-200',
          badge: 'bg-gray-100 text-gray-800 border-gray-200',
          badgeVariant: 'gray' as const,
          label: actionType,
          icon: Package,
        }
    }
  }

  const actionConfig = getActionConfig(action.actual_action)

  // Calculate effectiveness if we have price data
  const hasEffectivenessData = action.original_value && action.recovered_value
  const effectivenessPercent = hasEffectivenessData
    ? (action.recovered_value! / action.original_value!) * 100
    : null

  return (
    <div
      className={cn('cursor-pointer transition-all duration-1000', 'border-b')}
      onClick={handleCardClick}
    >
      <div className="flex gap-3 px-4 pb-6 items-start relative group">
        <Badge
          variant="outline"
          className={cn(
            'border-2 rounded-full cursor-pointer flex items-center justify-center',
            'h-6 w-6 p-0 bg-brand-white transition-all duration-200',
            actionConfig.bgColor,
          )}
        >
          <CheckIcon className={cn(actionConfig.textColor, 'h-4 w-4')} />
        </Badge>

        <div className="flex flex-col min-w-0 flex-1 gap-4">
          <div className="flex flex-col gap-2">
            <Typography variant="h4">{action.product_name || 'Unknown Product'}</Typography>

            <div className="flex-1">
              <Typography className="flex gap-1 sm:w-8/12">
                <span className="flex-shrink-0">Action</span>
                <span className="truncate lowercase">
                  {actionConfig.label} •{' '}
                  {action.batch_number?.slice(0, 8) || action.batch_id.slice(0, 8)}
                  ...
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
                Date: {actionDate.toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                {action.quantity_affected && (
                  <>
                    <Package className="h-3 w-3" />
                    {action.quantity_affected} units
                  </>
                )}
                {action.location_code && !action.quantity_affected && (
                  <>
                    <MapPin className="h-3 w-3" />
                    {action.location_code}
                  </>
                )}
              </span>
            </Typography>

            <div className="flex sm:items-center sm:justify-between flex-col sm:flex-row gap-2">
              <Badge className="w-max" variant={actionConfig.badgeVariant}>
                {actionConfig.label}
              </Badge>

              {isRecent ? (
                <Badge className="w-max" variant="primary">
                  recent action
                </Badge>
              ) : hasEffectivenessData && effectivenessPercent !== null ? (
                <Badge
                  className="w-max"
                  variant={effectivenessPercent >= 50 ? 'primary' : 'secondary'}
                >
                  {effectivenessPercent.toFixed(0)}% recovered
                </Badge>
              ) : (
                <Badge className="w-max" variant="secondary">
                  completed
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="absolute right-4 top-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-muted rounded p-1.5 group/edit">
          <PenLine className="h-4 w-4" />
          <div className="absolute right-2 text-xs w-min text-nowrap bg-brand-dark font-medium text-white rounded-lg py-1 px-2.5 -top-full opacity-0 group-hover/edit:opacity-100 transition-all duration-1000 delay-300">
            Edit action
          </div>
        </div>
      </div>
    </div>
  )
}
