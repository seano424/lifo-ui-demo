import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface BatchListFiltersProps {
  filters?: {
    expiringInDays?: number
    status?: string
  }
  onFiltersChange?: (filters: { expiringInDays?: number; status?: string }) => void
  count: number
  isLoading: boolean
}

export function BatchListFilters({
  filters,
  onFiltersChange,
  count,
  isLoading,
}: BatchListFiltersProps) {
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
        <span className="text-sm text-muted-foreground mr-2">{count} items</span>
      )}
      <Select
        value={filters?.expiringInDays?.toString() || 'all'}
        onValueChange={value =>
          onFiltersChange({
            ...filters,
            expiringInDays: value === 'all' ? undefined : parseInt(value),
          })
        }
        disabled={isLoading}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Expiry filter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All items </SelectItem>
          <SelectItem value="3">Expiring in 3 days</SelectItem>
          <SelectItem value="7">Expiring in 7 days</SelectItem>
          <SelectItem value="14">Expiring in 14 days</SelectItem>
          <SelectItem value="30">Expiring in 30 days</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters?.status || 'all'}
        onValueChange={value =>
          onFiltersChange({
            ...filters,
            status: value === 'all' ? undefined : value,
          })
        }
        disabled={isLoading}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="expired">Expired</SelectItem>
          <SelectItem value="damaged">Damaged</SelectItem>
          <SelectItem value="sold_out">Sold Out</SelectItem>
          <SelectItem value="reserved">Reserved</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
