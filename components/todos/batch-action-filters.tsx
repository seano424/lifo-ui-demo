import { ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type BatchActionFiltersType = {
  actionType?: string
  sort?: {
    field: 'action_date' | 'expiry_date' | 'actual_action' | 'effectiveness'
    direction: 'asc' | 'desc'
  }
}

interface BatchActionFiltersProps {
  filters?: BatchActionFiltersType
  onFiltersChange?: (filters: BatchActionFiltersType) => void
  isLoading: boolean
}

export function BatchActionFilters({
  filters,
  onFiltersChange,
  isLoading,
}: BatchActionFiltersProps) {
  if (!onFiltersChange) {
    return null
  }

  const currentSort = filters?.sort || { field: 'action_date', direction: 'desc' }

  const handleSortFieldChange = (field: string) => {
    onFiltersChange({
      ...filters,
      sort: {
        field: field as 'action_date' | 'expiry_date' | 'actual_action' | 'effectiveness',
        direction: currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc',
      },
    })
  }

  const handleSortDirectionToggle = () => {
    onFiltersChange({
      ...filters,
      sort: {
        field: currentSort.field,
        direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
      },
    })
  }

  return (
    <div className="flex flex-row justify-between gap-4">
      {/* Action Type Filter */}
      <div className="flex items-center gap-2">
        <Select
          value={filters?.actionType || 'all'}
          onValueChange={value =>
            onFiltersChange({
              ...filters,
              actionType: value === 'all' ? undefined : value,
            })
          }
          disabled={isLoading}
        >
          <SelectTrigger className="w-full flex gap-2 text-nowrap min-w-[200px]">
            <SelectValue placeholder="All action types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Action Types</SelectItem>
            <SelectItem value="discount">Action: Discount</SelectItem>
            <SelectItem value="donate">Action: Donate</SelectItem>
            <SelectItem value="dispose">Action: Dispose</SelectItem>
            <SelectItem value="maintain">Action: Maintain</SelectItem>
            <SelectItem value="ignored">Action: Ignored</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <Select
          value={currentSort.field}
          onValueChange={handleSortFieldChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="action_date">Action Date</SelectItem>
            <SelectItem value="expiry_date">Expiry Date</SelectItem>
            <SelectItem value="actual_action">Action Type</SelectItem>
            <SelectItem value="effectiveness">Effectiveness</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={handleSortDirectionToggle}
          disabled={isLoading}
          className="w-auto select-none"
        >
          {currentSort.direction === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
          <span className="ml-1 hidden sm:block">
            {currentSort.direction === 'asc' ? 'Asc' : 'Desc'}
          </span>
        </Button>
      </div>
    </div>
  )
}
