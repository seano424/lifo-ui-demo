import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
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
      name: 'Name',
      category: 'Category',
      brand: 'Brand',
      total_stock: 'Stock',
      base_selling_price: 'Price',
      active_batches_count: 'Active Batches',
      created_at: 'Date Added',
      updated_at: 'Last Updated',
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
        <Button variant="outline" disabled={isLoading} className="min-w-[120px] justify-between">
          {getCurrentSortLabel()}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem onClick={() => updateSort('name')} className="justify-between">
          Name
          {getSortIcon('name')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => updateSort('category')} className="justify-between">
          Category
          {getSortIcon('category')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => updateSort('brand')} className="justify-between">
          Brand
          {getSortIcon('brand')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => updateSort('total_stock')} className="justify-between">
          Stock
          {getSortIcon('total_stock')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSort('base_selling_price')}
          className="justify-between"
        >
          Price
          {getSortIcon('base_selling_price')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSort('active_batches_count')}
          className="justify-between"
        >
          Active Batches
          {getSortIcon('active_batches_count')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => updateSort('created_at')} className="justify-between">
          Date Added
          {getSortIcon('created_at')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
