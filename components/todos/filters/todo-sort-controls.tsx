'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslations } from 'next-intl'
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
  labelKey: string
  descriptionKey: string
}[] = [
  {
    value: 'urgency',
    labelKey: 'sort.urgency.label',
    descriptionKey: 'sort.urgency.description',
  },
  {
    value: 'expiry_date',
    labelKey: 'sort.expiryDate.label',
    descriptionKey: 'sort.expiryDate.description',
  },
  {
    value: 'current_quantity',
    labelKey: 'sort.quantity.label',
    descriptionKey: 'sort.quantity.description',
  },
  {
    value: 'potential_loss',
    labelKey: 'sort.potentialLoss.label',
    descriptionKey: 'sort.potentialLoss.description',
  },
  {
    value: 'alphabetical',
    labelKey: 'sort.productName.label',
    descriptionKey: 'sort.productName.description',
  },
  {
    value: 'action_date',
    labelKey: 'sort.lastAction.label',
    descriptionKey: 'sort.lastAction.description',
  },
  {
    value: 'effectiveness',
    labelKey: 'sort.effectiveness.label',
    descriptionKey: 'sort.effectiveness.description',
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
  const t = useTranslations('todos')
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
          <SelectValue>{currentOption ? t(currentOption.labelKey) : t('sort.sortBy')}</SelectValue>
        </SelectTrigger>
        <SelectContent id="todos-sort-field-content">
          {SORT_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col">
                <span className="font-medium">{t(option.labelKey)}</span>
                <span className="text-xs text-muted-foreground">{t(option.descriptionKey)}</span>
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
        title={t('sort.sortDirection', {
          direction: currentSortConfig.direction === 'asc' ? t('sort.asc') : t('sort.desc'),
        })}
      >
        {currentSortConfig.direction === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
        <span className="ml-1 flex">
          {currentSortConfig.direction === 'asc' ? t('sort.asc') : t('sort.desc')}
        </span>
      </Button>
    </div>
  )
}
