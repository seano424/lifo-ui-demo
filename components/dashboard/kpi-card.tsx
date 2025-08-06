'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface KPICardProps {
  icon: string
  label: string
  value: number
  change: number
  changePercent?: number
  subtitle: string
  isLoading?: boolean
  isError?: boolean
  onClick?: () => void
  className?: string
  isCurrency?: boolean
}

export function KPICard({
  icon,
  label,
  value,
  change,
  changePercent,
  subtitle,
  isLoading = false,
  isError = false,
  onClick,
  className,
  isCurrency = true,
}: KPICardProps) {
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

  const isPositive = change >= 0

  if (isLoading) {
    return (
      <div className={cn(
        'bg-white rounded-xl p-6 shadow-sm border border-gray-100',
        className
      )}>
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-12 w-12 rounded" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className={cn(
        'bg-white rounded-xl p-6 shadow-sm border border-red-100',
        className
      )}>
        <div className="text-red-600 text-sm">Failed to load data</div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-white rounded-xl p-6 shadow-sm border border-gray-100',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-gray-200',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-gray-600 font-medium">{label}</p>
          
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">
              {formatValue(value)}
            </span>
            
            {change !== 0 && (
              <div className={cn(
                'flex items-center gap-1 text-sm font-medium',
                isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                <span>{formatChange(change)}</span>
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  )
}