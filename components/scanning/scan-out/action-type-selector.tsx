'use client'

import { HandHeart, ShoppingCart, ClipboardXIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ActionType } from '@/types/scanning'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ActionTypeSelectorProps {
  selectedAction: ActionType
  onActionChange: (action: ActionType) => void
  variant?: 'default' | 'compact'
  className?: string
}

/**
 * Action type selector component for scan-out workflow
 * Allows users to choose between sold/donate/dispose actions
 */
export default function ActionTypeSelector({
  selectedAction,
  onActionChange,
  variant = 'default',
  className = '',
}: ActionTypeSelectorProps) {
  const t = useTranslations('scanOut.actions')

  const actions: Array<{
    type: ActionType
    label: string
    icon: typeof ShoppingCart
    color: string
    activeColor: string
  }> = [
    {
      type: 'sold',
      label: t('sell'),
      icon: ShoppingCart,
      color: 'text-gray-600',
      activeColor: 'text-primary-800 bg-primary-100 border-primary-700',
    },
    {
      type: 'donate',
      label: t('donate'),
      icon: HandHeart,
      color: 'text-gray-600',
      activeColor: 'text-blue-700 bg-blue-100 border-blue-700',
    },
    {
      type: 'dispose',
      label: t('dispose'),
      icon: ClipboardXIcon,
      color: 'text-gray-600',
      activeColor: 'text-destructive bg-destructive border-destructive',
    },
  ]

  if (variant === 'compact') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {actions.map(action => {
          const Icon = action.icon
          const isActive = selectedAction === action.type
          return (
            <Tooltip key={action.type}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onActionChange(action.type)}
                  className={`flex items-center justify-center px-2 py-1 rounded-lg border-2 transition-all ${
                    isActive
                      ? action.activeColor
                      : 'text-gray-400 bg-white border-gray-200 hover:border-gray-300'
                  }`}
                  aria-label={action.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <Typography className="text-white">{action.label}</Typography>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {actions.map(action => {
        const Icon = action.icon
        const isActive = selectedAction === action.type
        return (
          <Tooltip key={action.type}>
            <TooltipTrigger asChild>
              <Button
                variant={isActive ? 'default' : 'outline'}
                onClick={() => onActionChange(action.type)}
                className={cn(
                  'flex flex-col items-center gap-2 border w-full',
                  isActive && 'text-white',
                )}
              >
                <Icon className="h-5 w-5" />
                <Typography
                  className={cn(
                    isActive ? 'text-white' : 'text-gray-600',
                    'transition-all ease-in-out',
                  )}
                >
                  {action.label}
                </Typography>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <Typography className="text-white">{action.label}</Typography>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
