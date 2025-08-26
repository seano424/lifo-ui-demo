'use client'

import { Euro, GiftIcon, type LucideIcon, Trash2, ZapIcon } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import type { KPITrendData } from '@/lib/queries/dashboard-kpi-trends'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'

interface KPICardProps {
  icon: 'euro' | 'sales' | 'donation' | 'waste'
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
  trendData?: KPITrendData
  showTrends?: boolean
}

const iconMap: Record<string, LucideIcon> = {
  euro: Euro,
  sales: ZapIcon,
  donation: GiftIcon,
  waste: Trash2,
}

export function KPICard({
  icon,
  label,
  value,
  productCount,
  subtitle,
  isLoading = false,
  isError = false,
  onClick,
  className,
  isCurrency = true,
  isLink = false,
  link,
  trendData,
  showTrends = false,
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

  if (isLoading) {
    return (
      <div
        className={cn(
          'bg-white dark:bg-brand-dark dark:border-primary-900 rounded-4xl p-6 shadow-sm border border-gray-100 space-y-3 flex flex-col items-center',
          className
        )}
      >
        <Skeleton className="h-8 w-full rounded-4xl" />
        <Skeleton className="h-8 w-2/3 rounded-4xl" />
        <Skeleton className="h-8 w-3/5 rounded-4xl" />
        <Skeleton className="h-8 w-1/2 rounded-4xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className={cn(
          'bg-white dark:bg-brand-dark dark:border-primary-900 rounded-4xl p-6 shadow-sm border border-gray-100 space-y-3 flex flex-col items-center min-h-[200px] justify-center',
          className
        )}
      >
        <Typography className="text-secondary-600">
          Failed to load data
        </Typography>
      </div>
    )
  }

  const cardContent = (
    <div className="space-y-2 flex flex-col items-center text-center">
      <Typography
        variant="h4"
        className="font-bold flex items-center gap-2"
      >
        {iconMap[icon as keyof typeof iconMap] &&
          (() => {
            const IconComponent = iconMap[icon as keyof typeof iconMap]
            return IconComponent ? (
              <IconComponent className="w-6 h-6 bg-primary-50/30 rounded-full p-1" />
            ) : null
          })()}

        {label}
      </Typography>

      <div className="flex flex-col gap-3 items-center">
        <Typography
          variant="h3"
          className="font-bold"
        >
          {showTrends && trendData
            ? formatValue(trendData.current)
            : formatValue(value)}
        </Typography>

        <div className="flex items-center gap-2 mb-2">
          <Typography variant="p">{subtitle}</Typography>
          {productCount && (
            <Typography
              variant="p"
              className=""
            >
              {productCount} product{productCount > 1 ? 's' : ''}
            </Typography>
          )}
        </div>

        <Button variant="subtleSecondary">View details</Button>
      </div>
    </div>
  )

  const cardClassName = cn(
    'rounded-4xl py-6 border bg-white dark:bg-brand-dark dark:border-primary-900',
    'transition-all duration-200',
    (isLink || onClick) &&
      'cursor-pointer hover:shadow-md hover:border-primary-100/50 group',
    className
  )

  // If isLink is true and link is provided, render as Next.js Link
  if (isLink && link) {
    return (
      <Link
        href={link}
        className={cardClassName}
      >
        {cardContent}
      </Link>
    )
  }

  // Otherwise render as a clickable div
  return (
    <div
      className={cardClassName}
      onClick={onClick}
    >
      {cardContent}
    </div>
  )
}
