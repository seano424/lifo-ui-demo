'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'

interface KPICardProps {
  icon: string
  label: string
  value: number
  change?: number
  productCount?: number
  changePercent?: number
  subtitle: string
  isLoading?: boolean
  isError?: boolean
  onClick?: () => void
  className?: string
  isCurrency?: boolean
  isLink?: boolean
  link?: string
}

export function KPICard({
  label,
  value,
  change,
  productCount,
  subtitle,
  isLoading = false,
  isError = false,
  onClick,
  className,
  isCurrency = true,
  isLink = false,
  link,
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

  const isPositive = change && change >= 0

  if (isLoading) {
    return (
      <div
        className={cn(
          'bg-white rounded-4xl p-6 shadow-sm border border-gray-100 space-y-3 flex flex-col items-center',
          className,
        )}
      >
        <Skeleton className="h-8 w-full rounded-4xl" />
        <Skeleton className="h-8 w-2/3 rounded-4xl" />
        <Skeleton className="h-8 w-3/5 rounded-4xl" />
        <Skeleton className="h-8 w-1/2 rounded-4xl" />
        <Skeleton className="h-12 w-1/2 rounded-4xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className={cn(
          'bg-white rounded-4xl p-6 shadow-sm border border-gray-100 space-y-3 flex flex-col items-center min-h-[200px] justify-center',
          className,
        )}
      >
        <Typography className="text-secondary-600">Failed to load data</Typography>
      </div>
    )
  }

  const cardContent = (
    <div className="space-y-2 flex flex-col items-center text-center">
      <Typography variant="h3" className="font-black">
        {label}
      </Typography>

      <div className="flex flex-col gap-3 items-center">
        <Typography variant="h4" className="">
          {formatValue(value)}
        </Typography>

        {change && change !== 0 && (
          <div className="flex flex-col gap-3 items-center">
            <Typography variant="h4" className={cn('flex items-center gap-1 ')}>
              <span>{formatChange(change ?? 0)}</span>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </Typography>
            {/* {changePercent !== undefined && Math.abs(changePercent) > 0 && (
              <Typography
                variant="h4"
                className={cn(
                  'flex items-center gap-1 ',
                  isPositive ? 'text-primary-700' : 'text-secondary-600',
                )}
              >
                ({isPositive ? '+' : ''}
                {changePercent.toFixed(1)}%)
              </Typography>
            )} */}
          </div>
        )}

        {productCount && (
          <Typography variant="h4" className="">
            {productCount} product{productCount > 1 ? 's' : ''}
          </Typography>
        )}

        <Typography variant="h4" className="">
          {subtitle}
        </Typography>
        <Typography
          variant="h4"
          className="bg-secondary-50 border border-secondary-100 text-black rounded-full px-4 py-2 group-hover:bg-secondary-100/50 transition-all duration-200 ease-in-out group-hover:border-primary-400"
          onClick={onClick}
        >
          View details
        </Typography>
      </div>
    </div>
  )

  const cardClassName = cn(
    'bg-white rounded-4xl py-6 shadow-sm shadow-primary-100/10 border-4',
    'transition-all duration-200',
    (isLink || onClick) && 'cursor-pointer hover:shadow-md hover:border-primary-400 group',
    className,
  )

  // If isLink is true and link is provided, render as Next.js Link
  if (isLink && link) {
    return (
      <Link href={link} className={cardClassName}>
        {cardContent}
      </Link>
    )
  }

  // Otherwise render as a clickable div
  return (
    <div className={cardClassName} onClick={onClick}>
      {cardContent}
    </div>
  )
}
