import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface BatchListFiltersProps {
  filters?: {
    expiringInDays?: number
    status?: string
  }
  onFiltersChange?: (filters: { expiringInDays?: number; status?: string }) => void
  isLoading: boolean
}

export function BatchListFilters({ filters, onFiltersChange, isLoading }: BatchListFiltersProps) {
  if (!onFiltersChange) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date Filter Dropdown */}
      <Select
        value={filters?.expiringInDays?.toString() || '180'}
        onValueChange={value =>
          onFiltersChange({
            ...filters,
            expiringInDays: parseInt(value, 10),
          })
        }
        disabled={isLoading}
      >
        <SelectTrigger className="w-[140px]" hideChevron>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Date:</span>
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="3" hideCheckIcon>
            3D
          </SelectItem>
          <SelectItem value="7" hideCheckIcon>
            7D
          </SelectItem>
          <SelectItem value="14" hideCheckIcon>
            14D
          </SelectItem>
          <SelectItem value="30" hideCheckIcon>
            30D
          </SelectItem>
          <SelectItem value="90" hideCheckIcon>
            90D
          </SelectItem>
          <SelectItem value="180" hideCheckIcon>
            180D
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Status Filter Dropdown */}
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
        <SelectTrigger className="w-[140px]" hideChevron>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" hideCheckIcon>
            All
          </SelectItem>
          <SelectItem value="active" hideCheckIcon>
            Active
          </SelectItem>
          <SelectItem value="expired" hideCheckIcon>
            Expired
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
