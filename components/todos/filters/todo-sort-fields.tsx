'use client'

import { cn } from '@/lib/utils'
import {
  ArrowDownAZ,
  Calendar,
  ClipboardList,
  DollarSign,
  Package,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { sortFieldOptions } from '@/lib/todo-filter-config'
import type { SortField } from './types'

// Icon map for sort field icons
const iconMap = {
  Zap,
  Calendar,
  Package,
  DollarSign,
  ArrowDownAZ,
  ClipboardList,
  TrendingUp,
}

// Helper to convert snake_case to camelCase for translation keys
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

interface TodoSortFieldsProps {
  selectedField: SortField
  onFieldSelect: (field: SortField) => void
}

export function TodoSortFields({ selectedField, onFieldSelect }: TodoSortFieldsProps) {
  const t = useTranslations('todos.sort')

  return (
    <div className="w-44 border-r border-gray-200 bg-gray-50/50 py-2">
      {sortFieldOptions.map(option => {
        const isSelected = selectedField === option.value
        const Icon = iconMap[option.icon as keyof typeof iconMap]
        const translationKey = toCamelCase(option.value)

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onFieldSelect(option.value as SortField)}
            className={cn(
              'w-full px-4 py-2.5 flex items-center gap-2 text-left transition-colors',
              'hover:bg-gray-100',
              isSelected && 'bg-violet-50 text-violet-700 ',
              !isSelected && 'text-gray-700',
            )}
          >
            {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
            <div className="flex flex-col min-w-0">
              <span className="text-sm truncate">{t(`${translationKey}.label`)}</span>
              <span className="text-xs text-gray-500 truncate">
                {t(`${translationKey}.description`)}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
