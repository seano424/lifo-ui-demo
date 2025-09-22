'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

interface TodoSearchBarProps {
  searchTerm?: string
  onSearchChange: (searchTerm: string | undefined) => void
  placeholder?: string
  isLoading?: boolean
}

export function TodoSearchBar({
  searchTerm = '',
  onSearchChange,
  placeholder = 'Search products...',
  isLoading = false,
}: TodoSearchBarProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)

  // Debounce the search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300)

  // Update parent when debounced value changes
  useEffect(() => {
    const trimmed = debouncedSearchTerm.trim()
    onSearchChange(trimmed || undefined)
  }, [debouncedSearchTerm])

  // Sync with external changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])

  const handleClear = () => {
    setLocalSearchTerm('')
    onSearchChange(undefined)
  }

  const hasSearch = localSearchTerm.trim().length > 0

  return (
    <div className="relative flex items-center gap-2 w-full max-w-sm">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={localSearchTerm}
          onChange={(e) => setLocalSearchTerm(e.target.value)}
          disabled={isLoading}
          className="pl-10 pr-10"
        />
        {hasSearch && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Stats */}
      {isLoading && hasSearch && (
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          Searching...
        </div>
      )}
    </div>
  )
}