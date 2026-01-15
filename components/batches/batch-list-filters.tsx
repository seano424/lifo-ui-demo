import { useTranslations } from 'next-intl'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface BatchListFiltersProps {
  filters?: {
    expiringInDays?: number
    status?: string
  }
  onFiltersChange?: (filters: { expiringInDays?: number; status?: string }) => void
  isLoading: boolean
}

export function BatchListFilters({ filters, onFiltersChange, isLoading }: BatchListFiltersProps) {
  const t = useTranslations('batchFilters')

  if (!onFiltersChange) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date Filter Dropdown */}
      <Select
        value={filters?.expiringInDays?.toString() || '180'}
        onValueChange={value =>
          onFiltersChange({
            ...filters,
            expiringInDays: parseInt(value, 10),
          })
        }
        disabled={isLoading}
      >
        <SelectTrigger className="w-[140px]" hideChevron>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('date')}:</span>
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="3" hideCheckIcon>
            {t('3days')}
          </SelectItem>
          <SelectItem value="7" hideCheckIcon>
            {t('7days')}
          </SelectItem>
          <SelectItem value="14" hideCheckIcon>
            {t('14days')}
          </SelectItem>
          <SelectItem value="30" hideCheckIcon>
            {t('30days')}
          </SelectItem>
          <SelectItem value="90" hideCheckIcon>
            {t('90days')}
          </SelectItem>
          <SelectItem value="180" hideCheckIcon>
            {t('180days')}
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Status Filter Dropdown */}
      <Select
        value={filters?.status || 'all'}
        onValueChange={value =>
          onFiltersChange({
            ...filters,
            status: value === 'all' ? undefined : value,
          })
        }
        disabled={isLoading}
      >
        <SelectTrigger className="w-[140px]" hideChevron>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('status')}:</span>
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" hideCheckIcon>
            {t('all')}
          </SelectItem>
          <SelectItem value="active" hideCheckIcon>
            {t('active')}
          </SelectItem>
          <SelectItem value="expired" hideCheckIcon>
            {t('expired')}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
