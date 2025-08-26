import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

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
    <div className="flex flex-col-reverse items-center md:flex-row justify-end gap-2">
      <div className="flex items-center gap-2">
        <Select
          value={filters?.expiringInDays?.toString() || 'all'}
          onValueChange={value =>
            onFiltersChange({
              ...filters,
              expiringInDays: value === 'all' ? undefined : parseInt(value, 10),
            })
          }
          disabled={isLoading}
        >
          <SelectTrigger className="w-full md:w-[180px]">
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
          <SelectTrigger className="w-full md:w-[140px]">
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

      {isLoading && (
        <Skeleton className="flex justify-between gap-1">
          <Skeleton className="h-5 w-6 bg-muted-foreground/10" />
          <Skeleton className="h-5 w-16 bg-muted-foreground/10" />
        </Skeleton>
      )}
      {!isLoading && count > 0 && (
        <span className="text-sm text-nowrap flex items-center text-muted-foreground px-2">
          {count} items
        </span>
      )}
    </div>
  )
}
