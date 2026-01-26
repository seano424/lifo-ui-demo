import { useTranslations } from 'next-intl'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
// import { Button } from '@/components/ui/button'
import type { BatchSort, BatchSortField } from '@/lib/queries/batches'
import { ArrowUpDownIcon } from 'lucide-react'

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
        <SelectTrigger className="w-max" hideChevron>
          <div className="flex items-center gap-2">
            <SelectValue className="whitespace-nowrap" />
            <ArrowUpDownIcon className="h-4 w-4" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at" hideCheckIcon>
            {t('createdDate')}
          </SelectItem>
          <SelectItem value="expiry_date" hideCheckIcon>
            {t('expiryDate')}
          </SelectItem>
          <SelectItem value="batch_number" hideCheckIcon>
            {t('batchNumber')}
          </SelectItem>
          <SelectItem value="product_name" hideCheckIcon>
            {t('productName')}
          </SelectItem>
          <SelectItem value="current_quantity" hideCheckIcon>
            {t('stockLevel')}
          </SelectItem>
          <SelectItem value="cost_price" hideCheckIcon>
            {t('costPrice')}
          </SelectItem>
          <SelectItem value="selling_price" hideCheckIcon>
            {t('sellingPrice')}
          </SelectItem>
          <SelectItem value="status" hideCheckIcon>
            {t('status')}
          </SelectItem>
        </SelectContent>
      </Select>

      {/* <Button
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
      </Button> */}
    </div>
  )
}
