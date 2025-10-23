'use client'

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Boxes,
  Building,
  Calendar,
  Package,
  SortAsc,
  Tag,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
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

export function ProductsSortToolbar({
  currentSort,
  onSortChange,
  totalCount,
  isLoading,
}: ProductsSortToolbarProps) {
  const t = useTranslations('productSort')

  const sortOptions: Array<{
    field: SortField
    label: string
    icon: React.ComponentType<{ className?: string }>
    description: string
  }> = [
    {
      field: 'name',
      label: t('productName'),
      icon: Package,
      description: t('productNameDesc'),
    },
    {
      field: 'category',
      label: t('category'),
      icon: Tag,
      description: t('categoryDesc'),
    },
    {
      field: 'brand',
      label: t('brand'),
      icon: Building,
      description: t('brandDesc'),
    },
    {
      field: 'total_stock',
      label: t('stockLevel'),
      icon: Boxes,
      description: t('stockLevelDesc'),
    },
    {
      field: 'active_batches_count',
      label: t('activeBatches'),
      icon: Boxes,
      description: t('activeBatchesDesc'),
    },
    {
      field: 'created_at',
      label: t('dateAdded'),
      icon: Calendar,
      description: t('dateAddedDesc'),
    },
  ]

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
    <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-2xl">
      <div className="flex items-center gap-4">
        {/* Sort Field Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isLoading}>
              <SortAsc className="mr-2 h-4 w-4" />
              {t('sortBy')}: {currentOption?.label || t('unknown')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>{t('sortProductsBy')}</DropdownMenuLabel>
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
                          {t('current')}
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
              {t('ascending')}
            </>
          ) : (
            <>
              <ArrowDown className="h-4 w-4" />
              {t('descending')}
            </>
          )}
        </Button>
      </div>

      {/* Sort Info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {totalCount !== undefined && <span>{t('productCount', { count: totalCount })}</span>}
        {currentOption && (
          <Badge variant="outline" className="text-xs">
            {currentOption.label} ({currentSort.direction === 'asc' ? '↑' : '↓'})
          </Badge>
        )}
      </div>
    </div>
  )
}

interface QuickSortButtonsProps {
  onSortChange: (sort: ProductSort) => void
  currentSort: ProductSort
  isLoading?: boolean
}

export function QuickSortButtons({ onSortChange, currentSort, isLoading }: QuickSortButtonsProps) {
  const t = useTranslations('productSort.quickSort')

  const quickSorts: Array<{ label: string; sort: ProductSort }> = [
    {
      label: t('newestFirst'),
      sort: { field: 'created_at', direction: 'desc' },
    },
    { label: t('aToZ'), sort: { field: 'name', direction: 'asc' } },
    { label: t('lowStock'), sort: { field: 'total_stock', direction: 'asc' } },
    {
      label: t('mostBatches'),
      sort: { field: 'active_batches_count', direction: 'desc' },
    },
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
