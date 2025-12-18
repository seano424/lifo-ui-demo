'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { filterCategories } from '@/lib/todo-filter-config'
import { TodoFilterCategories } from './todo-filter-categories'
import { TodoFilterOptions } from './todo-filter-options'
import type { TodoFiltersState } from './types'
import { useTranslations } from 'next-intl'
import { Filter } from 'lucide-react'

interface TodoFilterDropdownProps {
  filters: TodoFiltersState
  onFiltersChange: (filters: TodoFiltersState) => void
}

// Count active filters
function getActiveFilterCount(filters: TodoFiltersState): number {
  let count = 0
  if (filters.urgency_level && filters.urgency_level.length > 0) {
    count += filters.urgency_level.length
  }
  if (filters.action_type && filters.action_type.length > 0) {
    count += filters.action_type.length
  }
  if (filters.batch_status && filters.batch_status.length > 0) {
    count += filters.batch_status.length
  }
  if (filters.expiry_range) {
    count += 1
  }
  if (filters.product_name && filters.product_name.trim().length > 0) {
    count += 1
  }
  if (filters.days_to_expiry_min !== undefined && filters.days_to_expiry_min !== null) {
    count += 1
  }
  if (filters.days_to_expiry_max !== undefined && filters.days_to_expiry_max !== null) {
    count += 1
  }
  return count
}

export function TodoFilterDropdown({ filters, onFiltersChange }: TodoFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('urgency_level')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('todos')

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const filterCount = getActiveFilterCount(filters)

  return (
    <div className="w-full md:w-auto" ref={dropdownRef}>
      <Button
        variant={isOpen ? 'secondary' : 'outline'}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={cn(
          'gap-2 w-full md:w-auto',
          isOpen && 'bg-white hover:bg-primary-50 text-primary-900 border-primary-200 border',
        )}
      >
        <Filter className="h-4 w-4" />
        {t('filters.filtersTitle', { count: filterCount })}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 flex overflow-hidden min-w-full md:min-w-[480px]">
          <TodoFilterCategories
            categories={filterCategories}
            activeCategory={activeCategory}
            onCategorySelect={setActiveCategory}
            filters={filters}
          />
          <TodoFilterOptions
            categoryId={activeCategory}
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
        </div>
      )}
    </div>
  )
}
