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
  count: number
  isLoading: boolean
}

export function BatchListFilters({
  filters,
  onFiltersChange,
  count,
  isLoading,
}: BatchListFiltersProps) {
  const t = useTranslations('batchFilters')

  if (!onFiltersChange) {
    return null
  }

  return (
    <div className="flex flex-row lg:justify-end gap-2">
      <Select
        value={filters?.expiringInDays?.toString() || 'all'}
        onValueChange={value =>
          onFiltersChange({
            ...filters,
            expiringInDays: value === 'all' ? undefined : parseInt(value, 10),
          })
        }
        disabled={isLoading}
      >
        <SelectTrigger className="w-full md:w-[180px] text-nowrap">
          <SelectValue className="text-nowrap" placeholder={t('expiryFilter')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allItems')}</SelectItem>
          <SelectItem value="3">{t('expiringInDays', { days: 3 })}</SelectItem>
          <SelectItem value="7">{t('expiringInDays', { days: 7 })}</SelectItem>
          <SelectItem value="14">{t('expiringInDays', { days: 14 })}</SelectItem>
          <SelectItem value="30">{t('expiringInDays', { days: 30 })}</SelectItem>
        </SelectContent>
      </Select>

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
        <SelectTrigger className="w-full md:w-[140px] text-nowrap">
          <SelectValue className="text-nowrap" placeholder={t('status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allStatuses')}</SelectItem>
          <SelectItem value="active">{t('active')}</SelectItem>
          <SelectItem value="expired">{t('expired')}</SelectItem>
          <SelectItem value="damaged">{t('damaged')}</SelectItem>
          <SelectItem value="sold_out">{t('soldOut')}</SelectItem>
          <SelectItem value="reserved">{t('reserved')}</SelectItem>
        </SelectContent>
      </Select>

      {/* {isLoading && (
        <div className="hidden md:flex flex-col justify-center gap-1">
          <Skeleton className="h-1/4 w-16 bg-muted-foreground/5 rounded-none" />
          <Skeleton className="h-1/4 w-10 bg-muted-foreground/5 rounded-none" />
        </div>
      )} */}
      {!isLoading && count > 0 && (
        <span className="text-sm text-nowrap items-center text-muted-foreground px-2 hidden md:flex">
          {t('itemCount', { count })}
        </span>
      )}
    </div>
  )
}
