'use client'

import { HandHeart, ShoppingCart, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ActionType } from '@/types/scanning'

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
      label: t('sold'),
      icon: ShoppingCart,
      color: 'text-gray-600',
      activeColor: 'text-primary-700 bg-primary-100 border-primary-700',
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
      icon: Trash2,
      color: 'text-gray-600',
      activeColor: 'text-red-700 bg-red-100 border-red-700',
    },
  ]

  if (variant === 'compact') {
    return (
      <div className={`flex gap-1 ${className}`}>
        {actions.map(action => {
          const Icon = action.icon
          const isActive = selectedAction === action.type
          return (
            <button
              key={action.type}
              type="button"
              onClick={() => onActionChange(action.type)}
              className={`flex items-center justify-center px-2 py-1 rounded-lg border-2 transition-all ${
                isActive
                  ? action.activeColor
                  : 'text-gray-400 bg-white border-gray-200 hover:border-gray-300'
              }`}
              aria-label={action.label}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
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
          <button
            key={action.type}
            type="button"
            onClick={() => onActionChange(action.type)}
            className={`flex-1 flex flex-col items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 transition-all ${
              isActive
                ? action.activeColor
                : 'text-gray-600 bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        )
      })}
    </div>
  )
}
