import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  Clock,
  DollarSign,
  Package,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BatchSort, BatchSortField } from '@/lib/queries/batches'

interface BatchListSortControlsProps {
  currentSort: BatchSort
  updateSort: (field: BatchSortField) => void
  isLoading: boolean
}

export function BatchListSortControls({
  currentSort,
  updateSort,
  isLoading,
}: BatchListSortControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden md:block text-sm font-medium text-muted-foreground">Sort by:</span>

      <Select
        value={currentSort.field}
        onValueChange={(field: BatchSortField) => updateSort(field)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Created Date
            </div>
          </SelectItem>
          <SelectItem value="expiry_date">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Expiry Date
            </div>
          </SelectItem>
          <SelectItem value="batch_number">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Batch Number
            </div>
          </SelectItem>
          <SelectItem value="supplier">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Supplier
            </div>
          </SelectItem>
          <SelectItem value="current_quantity">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Stock Level
            </div>
          </SelectItem>
          <SelectItem value="cost_price">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Price
            </div>
          </SelectItem>
          <SelectItem value="selling_price">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Selling Price
            </div>
          </SelectItem>
          <SelectItem value="status">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Status
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={() => updateSort(currentSort.field)}
        disabled={isLoading}
        className="h-9 px-3 rounded-md text-sm font-normal w-full md:w-auto"
      >
        {currentSort.direction === 'asc' ? (
          <ArrowUp className="h-4 w-4 opacity-50" />
        ) : (
          <ArrowDown className="h-4 w-4 opacity-50" />
        )}
        {currentSort.direction === 'asc' ? 'ASC' : 'DESC'}
      </Button>
    </div>
  )
}
