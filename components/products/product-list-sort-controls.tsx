import { useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProductSort, SortField } from '@/lib/queries/products'
import { ArrowUpDownIcon } from 'lucide-react'

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
    <div className="flex items-center gap-2">
      <Select
        value={currentSort.field}
        onValueChange={(field: SortField) => updateSort(field)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-max" showChevron={false}>
          <div className="flex items-center gap-2">
            <SelectValue className="whitespace-nowrap" />
            <ArrowUpDownIcon className="h-4 w-4" />
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
          <SelectItem value="total_stock" hideCheckIcon>
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
    </div>
  )
}
