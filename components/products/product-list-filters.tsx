import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface ProductListFiltersProps {
  filters?: {
    category?: string
  }
  onFiltersChange?: (filters: { category?: string }) => void
  count: number
  isLoading: boolean
}

export function ProductListFilters({
  filters,
  onFiltersChange,
  count,
  isLoading,
}: ProductListFiltersProps) {
  if (!onFiltersChange) {
    return null
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {isLoading && (
        <Skeleton className="h-6 w-16 flex justify-center items-center">
          <Loader2 className="h-2 w-2 text-muted-foreground animate-spin" />
        </Skeleton>
      )}
      {!isLoading && count > 0 && (
        <span className="text-sm text-muted-foreground mr-2">{count} products</span>
      )}

      <Select
        value={filters?.category || 'all'}
        onValueChange={value =>
          onFiltersChange({
            ...filters,
            category: value === 'all' ? undefined : value,
          })
        }
        disabled={isLoading}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Category filter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          <SelectItem value="beverages">Beverages</SelectItem>
          <SelectItem value="bakery">Bakery</SelectItem>
          <SelectItem value="dairy">Dairy</SelectItem>
          <SelectItem value="meat">Meat</SelectItem>
          <SelectItem value="produce">Produce</SelectItem>
          <SelectItem value="frozen">Frozen</SelectItem>
          <SelectItem value="pantry">Pantry</SelectItem>
          <SelectItem value="snacks">Snacks</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
