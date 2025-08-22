'use client'

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Boxes,
  Building,
  Calendar,
  DollarSign,
  Package,
  SortAsc,
  Tag,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Typography } from '@/components/ui/typography'
import type { ProductSort, SortDirection, SortField } from '@/lib/queries/products'

interface ProductsSortToolbarProps {
  currentSort: ProductSort
  onSortChange: (sort: ProductSort) => void
  totalCount?: number
  isLoading?: boolean
}

const sortOptions: Array<{
  field: SortField
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = [
  {
    field: 'name',
    label: 'Product Name',
    icon: Package,
    description: 'Sort alphabetically by product name',
  },
  {
    field: 'category',
    label: 'Category',
    icon: Tag,
    description: 'Group by product category',
  },
  {
    field: 'brand',
    label: 'Brand',
    icon: Building,
    description: 'Sort alphabetically by brand',
  },
  {
    field: 'total_stock',
    label: 'Stock Level',
    icon: Boxes,
    description: 'Sort by current inventory quantity',
  },
  {
    field: 'base_selling_price',
    label: 'Selling Price',
    icon: DollarSign,
    description: 'Sort by product selling price',
  },
  {
    field: 'active_batches_count',
    label: 'Active Batches',
    icon: Boxes,
    description: 'Sort by number of active batches',
  },
  {
    field: 'created_at',
    label: 'Date Added',
    icon: Calendar,
    description: 'Sort by when product was added',
  },
]

export function ProductsSortToolbar({
  currentSort,
  onSortChange,
  totalCount,
  isLoading,
}: ProductsSortToolbarProps) {
  const currentOption = sortOptions.find(option => option.field === currentSort.field)

  const handleSortChange = (field: SortField) => {
    const newDirection: SortDirection =
      currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc'

    onSortChange({ field, direction: newDirection })
  }

  const handleDirectionToggle = () => {
    onSortChange({
      field: currentSort.field,
      direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
    })
  }

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-4">
        {/* Sort Field Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isLoading}>
              <SortAsc className="mr-2 h-4 w-4" />
              Sort by: {currentOption?.label || 'Unknown'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Sort Products By</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map(option => {
              const Icon = option.icon
              const isSelected = currentSort.field === option.field

              return (
                <DropdownMenuItem
                  key={option.field}
                  onClick={() => handleSortChange(option.field)}
                  className="flex items-start gap-3 py-3"
                >
                  <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{option.label}</span>
                      {isSelected && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <Typography variant="p" color="muted" className="mt-1">
                      {option.description}
                    </Typography>
                  </div>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Direction Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDirectionToggle}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {currentSort.direction === 'asc' ? (
            <>
              <ArrowUp className="h-4 w-4" />
              Ascending
            </>
          ) : (
            <>
              <ArrowDown className="h-4 w-4" />
              Descending
            </>
          )}
        </Button>
      </div>

      {/* Sort Info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {totalCount !== undefined && (
          <span>
            {totalCount} product{totalCount !== 1 ? 's' : ''}
          </span>
        )}
        {currentOption && (
          <Badge variant="outline" className="text-xs">
            {currentOption.label} ({currentSort.direction === 'asc' ? '↑' : '↓'})
          </Badge>
        )}
      </div>
    </div>
  )
}

// ✅ BONUS: Quick Sort Buttons Component
interface QuickSortButtonsProps {
  onSortChange: (sort: ProductSort) => void
  currentSort: ProductSort
  isLoading?: boolean
}

export function QuickSortButtons({ onSortChange, currentSort, isLoading }: QuickSortButtonsProps) {
  const quickSorts: Array<{ label: string; sort: ProductSort }> = [
    { label: 'Newest First', sort: { field: 'created_at', direction: 'desc' } },
    { label: 'A-Z', sort: { field: 'name', direction: 'asc' } },
    { label: 'Low Stock', sort: { field: 'total_stock', direction: 'asc' } },
    { label: 'Highest Price', sort: { field: 'base_selling_price', direction: 'desc' } },
    { label: 'Most Batches', sort: { field: 'active_batches_count', direction: 'desc' } },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {quickSorts.map(quickSort => {
        const isActive =
          currentSort.field === quickSort.sort.field &&
          currentSort.direction === quickSort.sort.direction

        return (
          <Button
            key={quickSort.label}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortChange(quickSort.sort)}
            disabled={isLoading}
            className="text-xs"
          >
            {quickSort.label}
            {isActive && <ArrowUpDown className="ml-1 h-3 w-3" />}
          </Button>
        )
      })}
    </div>
  )
}
