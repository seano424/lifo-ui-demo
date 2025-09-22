'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useMemo } from 'react'

export type SortField =
  | 'urgency'
  | 'expiry_date'
  | 'current_quantity'
  | 'potential_loss'
  | 'alphabetical'
  | 'action_date'
  | 'effectiveness'

export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  field: SortField
  direction: SortDirection
}

interface TodoSortControlsProps {
  sortConfig?: SortConfig
  onSortChange: (sortConfig: SortConfig) => void
  isLoading?: boolean
}

const SORT_OPTIONS: {
  value: SortField
  label: string
  description?: string
}[] = [
  {
    value: 'urgency',
    label: 'Urgency',
    description: 'Sort by priority level (critical → low)',
  },
  {
    value: 'expiry_date',
    label: 'Expiry Date',
    description: 'Sort by when items expire',
  },
  {
    value: 'current_quantity',
    label: 'Quantity',
    description: 'Sort by current stock quantity',
  },
  {
    value: 'potential_loss',
    label: 'Potential Loss',
    description: 'Sort by estimated financial impact',
  },
  {
    value: 'alphabetical',
    label: 'Product Name',
    description: 'Sort alphabetically by product name',
  },
  {
    value: 'action_date',
    label: 'Last Action',
    description: 'Sort by when action was last taken',
  },
  {
    value: 'effectiveness',
    label: 'Effectiveness',
    description: 'Sort by action effectiveness score',
  },
]

const DEFAULT_SORT_CONFIG: SortConfig = {
  field: 'urgency',
  direction: 'desc',
}

export function TodoSortControls({
  sortConfig,
  onSortChange,
  isLoading = false,
}: TodoSortControlsProps) {
  const currentSortConfig = sortConfig || DEFAULT_SORT_CONFIG

  const handleSortFieldChange = (field: SortField) => {
    // Keep same direction when changing field
    onSortChange({
      field,
      direction: currentSortConfig.direction,
    })
  }

  const handleDirectionToggle = () => {
    onSortChange({
      field: currentSortConfig.field,
      direction: currentSortConfig.direction === 'asc' ? 'desc' : 'asc',
    })
  }

  const currentOption = useMemo(() => {
    return SORT_OPTIONS.find(option => option.value === currentSortConfig.field)
  }, [currentSortConfig.field])

  return (
    <div className="flex items-center sm:justify-start w-full sm:w-auto gap-2">
      {/* Sort Field Selector */}
      <Select
        value={currentSortConfig.field}
        onValueChange={value => handleSortFieldChange(value as SortField)}
        disabled={isLoading}
      >
        <SelectTrigger className="sm:w-[160px] md:w-[180px]" id="todos-sort-field-trigger">
          <SelectValue>{currentOption?.label || 'Sort by'}</SelectValue>
        </SelectTrigger>
        <SelectContent id="todos-sort-field-content">
          {SORT_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort Direction Toggle */}
      <Button
        variant="subtleTertiary"
        onClick={handleDirectionToggle}
        disabled={isLoading}
        className="w-32 select-none px-3"
        title={`Sort ${currentSortConfig.direction === 'asc' ? 'ascending' : 'descending'}`}
      >
        {currentSortConfig.direction === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
        <span className="ml-1 flex">{currentSortConfig.direction === 'asc' ? 'Asc' : 'Desc'}</span>
      </Button>
    </div>
  )
}
