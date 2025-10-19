'use client'

import { CalendarDays } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type TimePeriod =
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'last_7_days'
  | 'last_30_days'
  | 'all_time'

export interface TimeRange {
  start: Date
  end: Date
  compareStart: Date
  compareEnd: Date
  label: string
  compareLabel: string
}

interface TimeSelectorProps {
  value: TimePeriod
  onChange: (period: TimePeriod) => void
}

export function getTimeRange(
  period: TimePeriod,
  t?: ReturnType<typeof useTranslations>,
): TimeRange {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (period) {
    case 'this_week': {
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay() + 1)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      const compareStart = new Date(startOfWeek)
      compareStart.setDate(compareStart.getDate() - 7)
      const compareEnd = new Date(endOfWeek)
      compareEnd.setDate(compareEnd.getDate() - 7)

      return {
        start: startOfWeek,
        end: endOfWeek,
        compareStart,
        compareEnd,
        label: t ? t('periods.thisWeek') : 'This Week',
        compareLabel: t ? t('compareLabels.lastWeek') : 'Last Week',
      }
    }

    case 'last_week': {
      const startOfLastWeek = new Date(today)
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 6)
      const endOfLastWeek = new Date(startOfLastWeek)
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6)
      endOfLastWeek.setHours(23, 59, 59, 999)

      const compareStart = new Date(startOfLastWeek)
      compareStart.setDate(compareStart.getDate() - 7)
      const compareEnd = new Date(endOfLastWeek)
      compareEnd.setDate(compareEnd.getDate() - 7)

      return {
        start: startOfLastWeek,
        end: endOfLastWeek,
        compareStart,
        compareEnd,
        label: t ? t('periods.lastWeek') : 'Last Week',
        compareLabel: t ? t('compareLabels.previousWeek') : 'Previous Week',
      }
    }

    case 'this_month': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      endOfMonth.setHours(23, 59, 59, 999)

      const compareStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const compareEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      compareEnd.setHours(23, 59, 59, 999)

      return {
        start: startOfMonth,
        end: endOfMonth,
        compareStart,
        compareEnd,
        label: t ? t('periods.thisMonth') : 'This Month',
        compareLabel: t ? t('compareLabels.lastMonth') : 'Last Month',
      }
    }

    case 'last_month': {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      endOfLastMonth.setHours(23, 59, 59, 999)

      const compareStart = new Date(today.getFullYear(), today.getMonth() - 2, 1)
      const compareEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0)
      compareEnd.setHours(23, 59, 59, 999)

      return {
        start: startOfLastMonth,
        end: endOfLastMonth,
        compareStart,
        compareEnd,
        label: t ? t('periods.lastMonth') : 'Last Month',
        compareLabel: t ? t('compareLabels.previousMonth') : 'Previous Month',
      }
    }

    case 'last_7_days': {
      const end = new Date(today)
      end.setHours(23, 59, 59, 999)
      const start = new Date(today)
      start.setDate(today.getDate() - 6)

      const compareEnd = new Date(start)
      compareEnd.setDate(compareEnd.getDate() - 1)
      compareEnd.setHours(23, 59, 59, 999)
      const compareStart = new Date(compareEnd)
      compareStart.setDate(compareStart.getDate() - 6)

      return {
        start,
        end,
        compareStart,
        compareEnd,
        label: t ? t('periods.last7Days') : 'Last 7 Days',
        compareLabel: t ? t('compareLabels.previous7Days') : 'Previous 7 Days',
      }
    }

    case 'last_30_days': {
      const end = new Date(today)
      end.setHours(23, 59, 59, 999)
      const start = new Date(today)
      start.setDate(today.getDate() - 29)

      const compareEnd = new Date(start)
      compareEnd.setDate(compareEnd.getDate() - 1)
      compareEnd.setHours(23, 59, 59, 999)
      const compareStart = new Date(compareEnd)
      compareStart.setDate(compareStart.getDate() - 29)

      return {
        start,
        end,
        compareStart,
        compareEnd,
        label: t ? t('periods.last30Days') : 'Last 30 Days',
        compareLabel: t ? t('compareLabels.previous30Days') : 'Previous 30 Days',
      }
    }

    case 'all_time': {
      // For all time, we compare current year vs previous year
      const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)

      const compareStartOfYear = new Date(today.getFullYear() - 1, 0, 1)
      const compareEndOfYear = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999)

      return {
        start: new Date('2000-01-01'), // Very early date to capture all data
        end: endOfYear,
        compareStart: compareStartOfYear,
        compareEnd: compareEndOfYear,
        label: t ? t('periods.allTime') : 'All Time',
        compareLabel: t ? t('compareLabels.previousYear') : 'Previous Year',
      }
    }
  }
}

const getPeriodOptions = (
  t: ReturnType<typeof useTranslations>,
): { value: TimePeriod; label: string }[] => [
  { value: 'this_week', label: t('periods.thisWeek') },
  { value: 'last_week', label: t('periods.lastWeek') },
  { value: 'this_month', label: t('periods.thisMonth') },
  { value: 'last_month', label: t('periods.lastMonth') },
  { value: 'last_7_days', label: t('periods.last7Days') },
  { value: 'last_30_days', label: t('periods.last30Days') },
  { value: 'all_time', label: t('periods.allTime') },
]

export function TimeSelector({ value, onChange }: TimeSelectorProps) {
  const t = useTranslations('timeSelector')
  const periodOptions = getPeriodOptions(t)

  return (
    <Select value={value} onValueChange={val => onChange(val as TimePeriod)}>
      <SelectTrigger className="w-full sm:w-[200px] border transition-colors">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {periodOptions.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
