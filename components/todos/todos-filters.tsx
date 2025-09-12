import { ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TodosFiltersProps {
  filters?: {
    urgency?: string
    sort?: {
      field: string
      direction: 'asc' | 'desc'
    }
  }
  onFiltersChange?: (filters: {
    urgency?: string
    sort?: { field: string; direction: 'asc' | 'desc' }
  }) => void
  isLoading: boolean
}

export function TodosFilters({
  filters,
  onFiltersChange,
  isLoading,
}: TodosFiltersProps) {
  if (!onFiltersChange) {
    return null
  }

  const currentSort = filters?.sort || { field: 'urgency', direction: 'desc' }

  const handleSortFieldChange = (field: string) => {
    onFiltersChange({
      ...filters,
      sort: {
        field,
        direction:
          currentSort.field === field && currentSort.direction === 'asc'
            ? 'desc'
            : 'asc',
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
      {/* Urgency Filter */}
      <div className="flex items-center gap-2">
        <Select
          value={filters?.urgency || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              urgency: value === 'all' ? undefined : value,
            })
          }
          disabled={isLoading}
        >
          <SelectTrigger className="w-full flex gap-2 text-nowrap min-w-[200px]">
            <SelectValue placeholder="All urgency levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency Priorities</SelectItem>
            <SelectItem value="critical">Priority: Critical</SelectItem>
            <SelectItem value="high">Priority: High</SelectItem>
            <SelectItem value="medium">Priority: Medium</SelectItem>
            <SelectItem value="low">Priority: Low</SelectItem>
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
            <SelectItem value="urgency">Urgency</SelectItem>
            <SelectItem value="expiry_date">Expiry Date</SelectItem>
            <SelectItem value="current_quantity">Quantity</SelectItem>
            <SelectItem value="potential_loss">Potential Loss</SelectItem>
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
