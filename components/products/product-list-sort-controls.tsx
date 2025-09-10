import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ProductSort, SortField } from '@/lib/queries/products'

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
  const getSortIcon = (field: SortField) => {
    if (currentSort.field === field) {
      return currentSort.direction === 'asc' ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : (
        <ArrowDown className="ml-2 h-4 w-4" />
      )
    }
    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
  }

  const getSortLabel = (field: SortField) => {
    const labels = {
      name: t('name'),
      category: t('category'),
      brand: t('brand'),
      total_stock: t('stock'),
      base_selling_price: t('price'),
      active_batches_count: t('activeBatches'),
      created_at: t('dateAdded'),
      updated_at: t('lastUpdated'),
    }
    return labels[field] || field
  }

  const getCurrentSortLabel = () => {
    const fieldLabel = getSortLabel(currentSort.field)
    const directionLabel = currentSort.direction === 'asc' ? '↑' : '↓'
    return `${fieldLabel} ${directionLabel}`
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={isLoading}
          className="min-w-[120px] justify-between text-nowrap"
        >
          {getCurrentSortLabel()}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[200px]"
      >
        <DropdownMenuItem
          onClick={() => updateSort('name')}
          className="justify-between text-nowrap"
        >
          {t('name')}
          {getSortIcon('name')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSort('category')}
          className="justify-between text-nowrap"
        >
          {t('category')}
          {getSortIcon('category')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSort('brand')}
          className="justify-between text-nowrap"
        >
          {t('brand')}
          {getSortIcon('brand')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSort('total_stock')}
          className="justify-between text-nowrap"
        >
          {t('stock')}
          {getSortIcon('total_stock')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSort('base_selling_price')}
          className="justify-between text-nowrap"
        >
          {t('price')}
          {getSortIcon('base_selling_price')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSort('active_batches_count')}
          className="justify-between text-nowrap"
        >
          {t('activeBatches')}
          {getSortIcon('active_batches_count')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSort('created_at')}
          className="justify-between text-nowrap"
        >
          {t('dateAdded')}
          {getSortIcon('created_at')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
