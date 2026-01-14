import { ArrowDown, ArrowUp } from 'lucide-react'
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
      <Select
        value={currentSort.field}
        onValueChange={(field: BatchSortField) => updateSort(field)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[180px] h-8">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('sortBy')}:</span>
            <SelectValue />
            {currentSort.direction === 'asc' ? (
              <ArrowUp className="h-3 w-3 text-muted-foreground ml-auto" />
            ) : (
              <ArrowDown className="h-3 w-3 text-muted-foreground ml-auto" />
            )}
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at">{t('createdDate')}</SelectItem>
          <SelectItem value="expiry_date">{t('expiryDate')}</SelectItem>
          <SelectItem value="batch_number">{t('batchNumber')}</SelectItem>
          <SelectItem value="product_name">{t('productName')}</SelectItem>
          <SelectItem value="current_quantity">{t('stockLevel')}</SelectItem>
          <SelectItem value="cost_price">{t('costPrice')}</SelectItem>
          <SelectItem value="selling_price">{t('sellingPrice')}</SelectItem>
          <SelectItem value="status">{t('status')}</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateSort(currentSort.field)}
        disabled={isLoading}
        className="h-8 w-8 p-0"
        title={currentSort.direction === 'asc' ? t('asc') : t('desc')}
      >
        {currentSort.direction === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}
