'use client'

import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/use-mobile'
import { ArrowUpDown, Filter } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { TodoSearchBar } from './todo-search-bar'

interface UnifiedSearchFiltersBarProps {
  searchTerm?: string
  onSearchChange: (searchTerm: string | undefined) => void
  onFiltersClick: () => void
  onSortClick: () => void
  isLoading?: boolean
  placeholder?: string
}

export function UnifiedSearchFiltersBar({
  searchTerm,
  onSearchChange,
  onFiltersClick,
  onSortClick,
  isLoading = false,
  placeholder,
}: UnifiedSearchFiltersBarProps) {
  const t = useTranslations('todos')
  const { isMobile } = useMediaQuery()

  if (isMobile) {
    return (
      <div className="px-4 py-6 space-y-6">
        {/* Filter and Sort Buttons Row */}
        <div className="flex justify-center gap-3">
          <Button
            variant="subtleTertiary"
            onClick={onFiltersClick}
            className="flex items-center gap-2 h-12 px-6 text-base font-medium"
          >
            <Filter className="w-5 h-5" />
            {t('filters.filtersTitle')}
          </Button>
          <Button
            variant="subtleTertiary"
            onClick={onSortClick}
            className="flex items-center gap-2 h-12 px-6 text-base font-medium"
          >
            <ArrowUpDown className="w-5 h-5" />
            {t('filters.sortTitle')}
          </Button>
        </div>

        {/* Search Bar Row */}
        <div className="flex justify-center">
          <TodoSearchBar
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            isLoading={isLoading}
            placeholder={placeholder || t('filters.searchPlaceholder') || 'Search products...'}
            size="medium"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="my-8">
      <div className="w-3/4 mx-auto">
        <div className="flex justify-center items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant="subtleTertiary"
              onClick={onFiltersClick}
              className="flex items-center gap-2 h-12 px-4 font-semibold"
            >
              <Filter className="w-4 h-4" />
              {t('filters.filtersTitle')}
            </Button>
            <Button
              variant="subtleTertiary"
              onClick={onSortClick}
              className="flex items-center gap-2 h-12 px-4 font-semibold"
            >
              <ArrowUpDown className="w-4 h-4" />
              {t('filters.sortTitle')}
            </Button>
          </div>
          <div>
            <TodoSearchBar
              searchTerm={searchTerm}
              onSearchChange={onSearchChange}
              isLoading={isLoading}
              placeholder={placeholder || t('filters.searchPlaceholder') || 'Search products...'}
              size="large"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
