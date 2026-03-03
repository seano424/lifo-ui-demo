import { useTranslations } from 'next-intl'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { BatchSort, BatchSortField } from '@/lib/queries/batches'
import { ArrowUpDownIcon, ArrowUp, ArrowDown } from 'lucide-react'

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
    <div className="flex items-center gap-1 border p-1 rounded-2xl">
      <Select
        value={currentSort.field}
        onValueChange={(field: BatchSortField) => updateSort(field)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-fit sm:w-max px-4" showChevron={false}>
          <div className="flex items-center justify-between w-full gap-1">
            <SelectValue className="whitespace-nowrap" />
            <ArrowUpDownIcon className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="expiry_date" hideCheckIcon>
            {t('expiryDate')}
          </SelectItem>
          <SelectItem value="product_name" hideCheckIcon>
            {t('productName')}
          </SelectItem>
          <SelectItem value="current_quantity" hideCheckIcon>
            {t('stockLevel')}
          </SelectItem>
          <SelectItem value="initial_quantity" hideCheckIcon>
            {t('initialQuantity')}
          </SelectItem>
          <SelectItem value="created_at" hideCheckIcon>
            {t('createdDate')}
          </SelectItem>
          <SelectItem value="updated_at" hideCheckIcon>
            {t('updatedDate')}
          </SelectItem>
        </SelectContent>
      </Select>

      <button
        type="button"
        onClick={() => updateSort(currentSort.field)}
        disabled={isLoading}
        className="size-8 rounded-full border border-border text-muted-foreground p-0 hover:bg-transparent hover:text-foreground flex items-center justify-center"
        title={currentSort.direction === 'asc' ? t('asc') : t('desc')}
      >
        {currentSort.direction === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}
