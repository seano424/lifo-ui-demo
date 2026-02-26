import { useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProductSort, SortField } from '@/lib/queries/products'
import { ArrowDown, ArrowUp, ArrowUpDownIcon } from 'lucide-react'

interface ProductListSortControlsProps {
  currentSort: ProductSort
  updateSort: (field: SortField) => void
  isLoading: boolean
}

export function ProductListSortControls({
  currentSort,
  updateSort,
  isLoading,
}: ProductListSortControlsProps) {
  const t = useTranslations('productListSort')

  return (
    <div className="flex items-center gap-1 border p-1 rounded-2xl">
      <Select
        value={currentSort.field}
        onValueChange={(field: SortField) => updateSort(field)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-max" showChevron={false}>
          <div className="flex items-center gap-2">
            <SelectValue className="whitespace-nowrap" />
            <ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name" hideCheckIcon>
            {t('name')}
          </SelectItem>
          <SelectItem value="category" hideCheckIcon>
            {t('category')}
          </SelectItem>
          <SelectItem value="brand" hideCheckIcon>
            {t('brand')}
          </SelectItem>
          <SelectItem value="batch_quantity" hideCheckIcon>
            {t('stock')}
          </SelectItem>
          <SelectItem value="active_batches_count" hideCheckIcon>
            {t('activeBatches')}
          </SelectItem>
          <SelectItem value="created_at" hideCheckIcon>
            {t('dateAdded')}
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
