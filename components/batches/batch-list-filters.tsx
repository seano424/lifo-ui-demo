import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

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
      {/* Expiry Filter Pills */}
      <div className="flex items-center gap-1">
        <Button
          variant={!filters?.expiringInDays ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFiltersChange({ ...filters, expiringInDays: undefined })}
          disabled={isLoading}
          className="h-8"
        >
          {t('allItems')}
        </Button>
        {[3, 7, 14, 30].map(days => (
          <Button
            key={days}
            variant={filters?.expiringInDays === days ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFiltersChange({ ...filters, expiringInDays: days })}
            disabled={isLoading}
            className="h-8"
          >
            {days}d
          </Button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-border" />

      {/* Status Filter Pills */}
      <div className="flex items-center gap-1">
        <Button
          variant={!filters?.status ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFiltersChange({ ...filters, status: undefined })}
          disabled={isLoading}
          className="h-8"
        >
          {t('allStatuses')}
        </Button>
        {['active', 'expired', 'damaged'].map(status => (
          <Button
            key={status}
            variant={filters?.status === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFiltersChange({ ...filters, status })}
            disabled={isLoading}
            className="h-8"
          >
            {t(status)}
          </Button>
        ))}
      </div>
    </div>
  )
}
