'use client'

import { cn } from '@/lib/utils'
import { Calendar, Package, Target, Zap } from 'lucide-react'
import type { FilterCategory } from '@/lib/todo-filter-config'
import type { TodoFiltersState } from './types'

// Icon map for category icons
const iconMap = {
  Zap,
  Target,
  Package,
  Calendar,
}

interface TodoFilterCategoriesProps {
  categories: FilterCategory[]
  activeCategory: string
  onCategorySelect: (categoryId: string) => void
  filters: TodoFiltersState
}

export function TodoFilterCategories({
  categories,
  activeCategory,
  onCategorySelect,
  filters,
}: TodoFilterCategoriesProps) {
  const hasSelections = (categoryId: string): boolean => {
    switch (categoryId) {
      case 'urgency_level':
        return Boolean(filters.urgency_level && filters.urgency_level.length > 0)
      case 'action_type':
        return Boolean(filters.action_type && filters.action_type.length > 0)
      case 'batch_status':
        return Boolean(filters.batch_status && filters.batch_status.length > 0)
      case 'expiry_range':
        return Boolean(filters.expiry_range)
      default:
        return false
    }
  }

  return (
    <div className="w-44 border-r border-gray-200 bg-gray-50/50 py-2">
      {categories.map(category => {
        const isActive = activeCategory === category.id
        const hasActive = hasSelections(category.id)
        const Icon = iconMap[category.icon as keyof typeof iconMap]

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategorySelect(category.id)}
            className={cn(
              'w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors',
              'hover:bg-gray-100',
              isActive && 'bg-primary-50 hover:bg-primary-50 text-primary-700 ',
              !isActive && 'text-gray-700',
            )}
          >
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4" />}
              <span className="text-sm">{category.label}</span>
            </div>
            {hasActive && (
              <span
                className="w-2 h-2 rounded-full bg-primary-500 block"
                role="status"
                aria-label="Has active filters"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
