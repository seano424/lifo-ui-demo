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
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('batchSort')

  return (
    <div className="flex items-center gap-2">
      <span className="hidden md:block text-sm font-medium text-muted-foreground">
        {t('sortBy')}:
      </span>

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
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('createdDate')}
            </span>
          </SelectItem>
          <SelectItem value="expiry_date">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t('expiryDate')}
            </span>
          </SelectItem>
          <SelectItem value="batch_number">
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('batchNumber')}
            </span>
          </SelectItem>
          <SelectItem value="supplier">
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('supplier')}
            </span>
          </SelectItem>
          <SelectItem value="current_quantity">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('stockLevel')}
            </span>
          </SelectItem>
          <SelectItem value="cost_price">
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t('costPrice')}
            </span>
          </SelectItem>
          <SelectItem value="selling_price">
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t('sellingPrice')}
            </span>
          </SelectItem>
          <SelectItem value="status">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('status')}
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={() => updateSort(currentSort.field)}
        disabled={isLoading}
        className="h-9 px-3 rounded-2xl text-sm font-normal w-full md:w-auto"
      >
        {currentSort.direction === 'asc' ? (
          <ArrowUp className="h-4 w-4 opacity-50" />
        ) : (
          <ArrowDown className="h-4 w-4 opacity-50" />
        )}
        {currentSort.direction === 'asc' ? t('asc') : t('desc')}
      </Button>
    </div>
  )
}
