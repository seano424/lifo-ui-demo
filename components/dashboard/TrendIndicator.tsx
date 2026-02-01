'use client'

import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export type TrendDirection = 'up' | 'down' | 'stable'

interface TrendIndicatorProps {
  current: number
  previous: number
  change: number
  changePercent: number
  trend: TrendDirection
  isCurrency?: boolean
  className?: string
  showDetails?: boolean
  periodMin?: number
  periodMax?: number
  minDate?: Date
  maxDate?: Date
}

export function TrendIndicator({
  current,
  previous,
  change,
  changePercent,
  trend,
  isCurrency = true,
  className,
  showDetails = false,
  periodMin,
  periodMax,
  minDate,
  maxDate,
}: TrendIndicatorProps) {
  const t = useTranslations('common.trendIndicator')

  const formatValue = (val: number) => {
    if (isCurrency) {
      return new Intl.NumberFormat('en-EU', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val)
    }
    return val.toLocaleString()
  }

  const formatChange = (val: number) => {
    if (isCurrency) {
      const formatted = new Intl.NumberFormat('en-EU', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.abs(val))
      return `${val >= 0 ? '+' : '-'}${formatted}`
    }
    return `${val >= 0 ? '+' : '-'}${Math.abs(val).toLocaleString()}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-EU', {
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />
      case 'down':
        return <TrendingDown className="h-4 w-4" />
      case 'stable':
        return <Minus className="h-4 w-4" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-primary-800'
      case 'down':
        return 'text-destructive'
      case 'stable':
        return 'text-foreground'
    }
  }

  const getBackgroundColor = () => {
    switch (trend) {
      case 'up':
        return 'bg-primary-50 border-primary-200'
      case 'down':
        return 'bg-red-50 border-destructive'
      case 'stable':
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex items-center gap-1 px-3 py-1 rounded-full border',
            getBackgroundColor(),
          )}
        >
          <span className={cn(' text-sm', getTrendColor())}>{formatChange(change)}</span>
          {getTrendIcon()}
          {Math.abs(changePercent) > 0.01 && (
            <span className={cn('text-sm', getTrendColor())}>
              ({changePercent > 0 ? '+' : ''}
              {changePercent.toFixed(1)}%)
            </span>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-foreground">
            <span>{t('previous')}</span>
            <span>{formatValue(previous)}</span>
          </div>

          {periodMin !== undefined && periodMax !== undefined && (
            <>
              <div className="flex items-center justify-between text-xs text-foreground">
                <span>{t('periodLow')}</span>
                <span>
                  {formatValue(periodMin)}
                  {minDate && ` (${formatDate(minDate)})`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-foreground">
                <span>{t('periodHigh')}</span>
                <span>
                  {formatValue(periodMax)}
                  {maxDate && ` (${formatDate(maxDate)})`}
                </span>
              </div>

              <PositionIndicator
                current={current}
                min={periodMin}
                max={periodMax}
                className="mt-2"
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface PositionIndicatorProps {
  current: number
  min: number
  max: number
  className?: string
}

function PositionIndicator({ current, min, max, className }: PositionIndicatorProps) {
  const range = max - min
  const position = range > 0 ? ((current - min) / range) * 100 : 50
  const clampedPosition = Math.max(0, Math.min(100, position))

  return (
    <div className={cn('relative h-2 bg-gray-200 rounded-full overflow-hidden', className)}>
      <div className="absolute inset-0 bg-linear-to-r from-destructive via-yellow-200 to-primary-200" />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary-600 rounded-full border-2 border-white shadow-sm"
        style={{ left: `${clampedPosition}%`, transform: 'translateX(-50%) translateY(-50%)' }}
      />
    </div>
  )
}
