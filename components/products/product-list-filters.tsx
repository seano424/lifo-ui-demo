import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
    <div className="flex justify-end gap-2">
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

      {isLoading && (
        <Skeleton className="flex justify-center items-center gap-1 px-2">
          <Skeleton className="h-2 w-4 bg-muted-foreground/10" />
          <Skeleton className="h-2 w-16 bg-muted-foreground/10" />
        </Skeleton>
      )}
      {!isLoading && count > 0 && (
        <span className="text-sm flex items-center text-muted-foreground px-2">
          {count} products
        </span>
      )}
    </div>
  )
}
