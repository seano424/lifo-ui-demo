'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce'
import { Search, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface TodoSearchBarProps {
  searchTerm?: string
  onSearchChange: (searchTerm: string | undefined) => void
  placeholder?: string
  isLoading?: boolean
  size?: 'default' | 'medium' | 'large'
}

export function TodoSearchBar({
  searchTerm = '',
  onSearchChange,
  placeholder,
  isLoading = false,
  size = 'default',
}: TodoSearchBarProps) {
  const t = useTranslations('todos')
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)

  // Debounce the search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300)

  // Update parent when debounced value changes
  useEffect(() => {
    const trimmed = debouncedSearchTerm.trim()
    onSearchChange(trimmed || undefined)
  }, [debouncedSearchTerm, onSearchChange])

  // Sync with external changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])

  const handleClear = () => {
    setLocalSearchTerm('')
    onSearchChange(undefined)
  }

  const hasSearch = localSearchTerm.trim().length > 0
  const isLarge = size === 'large'
  const isMedium = size === 'medium'

  return (
    <div
      className={`relative flex items-center gap-2 w-full ${
        isLarge
          ? 'min-w-[300px] md:max-w-[400px]'
          : isMedium
            ? 'min-w-[200px] md:max-w-[350px]'
            : 'md:max-w-sm'
      }`}
    >
      {/* Search Input */}
      <div className="relative flex-1">
        <Search
          className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground ${
            isLarge ? 'h-5 w-5' : isMedium ? 'h-4 w-4' : 'h-4 w-4'
          }`}
        />
        <Input
          type="text"
          placeholder={placeholder || t('filters.searchPlaceholder') || 'Search products...'}
          value={localSearchTerm}
          onChange={e => setLocalSearchTerm(e.target.value)}
          disabled={isLoading}
          className={`pl-10 pr-10 w-full ${
            isLarge
              ? 'h-12 text-lg border-2 focus:border-primary'
              : isMedium
                ? 'h-11 text-base border-2 focus:border-primary'
                : ''
          }`}
        />
        {hasSearch && (
          <Button
            variant="ghost"
            size={isLarge ? 'default' : isMedium ? 'sm' : 'sm'}
            onClick={handleClear}
            className={`absolute right-1 top-1/2 transform -translate-y-1/2 p-0 hover:bg-muted ${
              isLarge ? 'h-12 w-12' : isMedium ? 'h-9 w-9' : 'h-8 w-8'
            }`}
          >
            <X className={isLarge ? 'h-5 w-5' : isMedium ? 'h-4 w-4' : 'h-4 w-4'} />
          </Button>
        )}
      </div>

      {/* Search Stats */}
      {isLoading && hasSearch && (
        <div
          className={`text-muted-foreground whitespace-nowrap ${
            isLarge ? 'text-sm' : isMedium ? 'text-sm' : 'text-xs'
          }`}
        >
          {t('filters.searching')}
        </div>
      )}
    </div>
  )
}
