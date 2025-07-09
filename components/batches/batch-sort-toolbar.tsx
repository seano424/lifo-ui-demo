// components/batches/batch-sort-toolbar.tsx - Batch sorting controls (following product pattern)

'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  ArrowUp,
  ArrowDown,
  Calendar,
  Package,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import type { BatchSort, BatchSortField } from '@/lib/queries/batches'

interface BatchSortToolbarProps {
  currentSort: BatchSort
  onSortChange: (sort: BatchSort) => void
  totalCount: number
  isLoading?: boolean
}

export function BatchSortToolbar({
  currentSort,
  onSortChange,
  totalCount,
  isLoading = false,
}: BatchSortToolbarProps) {
  const sortOptions: {
    value: BatchSortField
    label: string
    icon: React.ComponentType<{ className?: string }>
  }[] = [
    { value: 'expiry_date', label: 'Expiry Date', icon: AlertTriangle },
    { value: 'received_date', label: 'Received Date', icon: Calendar },
    { value: 'batch_number', label: 'Batch Number', icon: Package },
    { value: 'current_quantity', label: 'Stock Level', icon: TrendingUp },
    { value: 'cost_price', label: 'Cost Price', icon: DollarSign },
    { value: 'selling_price', label: 'Selling Price', icon: DollarSign },
    { value: 'supplier', label: 'Supplier', icon: Package },
    { value: 'status', label: 'Status', icon: Clock },
    { value: 'created_at', label: 'Date Added', icon: Calendar },
  ]

  const handleFieldChange = (field: BatchSortField) => {
    onSortChange({ field, direction: currentSort.direction })
  }

  const handleDirectionToggle = () => {
    onSortChange({
      field: currentSort.field,
      direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
    })
  }

  const getSortIcon = () => {
    if (currentSort.direction === 'asc') {
      return <ArrowUp className="h-4 w-4" />
    } else {
      return <ArrowDown className="h-4 w-4" />
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Results count */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="px-3 py-1">
          {isLoading ? 'Loading...' : `${totalCount.toLocaleString()} batches`}
        </Badge>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Sort by:</span>

        {/* Sort field selector */}
        <Select value={currentSort.field} onValueChange={handleFieldChange} disabled={isLoading}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map(option => {
              const OptionIcon = option.icon
              return (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <OptionIcon className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        {/* Sort direction toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDirectionToggle}
          disabled={isLoading}
          className="px-3"
        >
          {getSortIcon()}
          <span className="ml-1 text-xs">{currentSort.direction === 'asc' ? 'ASC' : 'DESC'}</span>
        </Button>
      </div>
    </div>
  )
}

interface QuickBatchSortButtonsProps {
  currentSort: BatchSort
  onSortChange: (sort: BatchSort) => void
  isLoading?: boolean
}

export function QuickBatchSortButtons({
  currentSort,
  onSortChange,
  isLoading = false,
}: QuickBatchSortButtonsProps) {
  const quickSorts: { sort: BatchSort; label: string; description: string }[] = [
    {
      sort: { field: 'expiry_date', direction: 'asc' },
      label: 'Expiring Soon',
      description: 'Show batches expiring soonest first',
    },
    {
      sort: { field: 'current_quantity', direction: 'asc' },
      label: 'Low Stock',
      description: 'Show batches with lowest stock first',
    },
    {
      sort: { field: 'received_date', direction: 'desc' },
      label: 'Recently Added',
      description: 'Show newest batches first',
    },
    {
      sort: { field: 'cost_price', direction: 'desc' },
      label: 'Highest Value',
      description: 'Show most expensive batches first',
    },
    {
      sort: { field: 'batch_number', direction: 'asc' },
      label: 'Batch Number',
      description: 'Sort alphabetically by batch number',
    },
    {
      sort: { field: 'supplier', direction: 'asc' },
      label: 'By Supplier',
      description: 'Group by supplier alphabetically',
    },
  ]

  const isCurrentSort = (sort: BatchSort) => {
    return currentSort.field === sort.field && currentSort.direction === sort.direction
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {quickSorts.map(({ sort, label, description }) => (
        <Button
          key={`${sort.field}-${sort.direction}`}
          variant={isCurrentSort(sort) ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSortChange(sort)}
          disabled={isLoading}
          className="h-auto flex-col items-start p-3 text-left"
          title={description}
        >
          <span className="font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">
            {sort.field} {sort.direction}
          </span>
        </Button>
      ))}
    </div>
  )
}
