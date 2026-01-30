'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import type { KPITrendData } from '@/lib/queries/dashboard-kpi-trends'
import { cn } from '@/lib/utils'
import { Euro, GiftIcon, type LucideIcon, Trash2, ZapIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
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
  const t = useTranslations('dashboardNav.kpiCard')

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
      <div className={cn('bg-background border rounded-2xl p-5 flex flex-col h-full', className)}>
        <div className="flex items-start gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <Skeleton className="h-5 flex-1 rounded-lg" />
        </div>
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-2/3 rounded-lg" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4 rounded-lg" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/50">
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className={cn(
          'bg-background border rounded-2xl p-5 flex flex-col items-center justify-center min-h-[160px]',
          className,
        )}
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
            <Typography className="text-destructive text-xl">⚠</Typography>
          </div>
          <Typography className="text-muted-foreground text-sm">{t('failedToLoad')}</Typography>
        </div>
      </div>
    )
  }

  const cardContent = (
    <div className="flex flex-col h-full">
      {/* Header with icon and label */}
      <div className="flex items-start gap-3 mb-4">
        {iconMap[icon as keyof typeof iconMap] &&
          (() => {
            const IconComponent = iconMap[icon as keyof typeof iconMap]
            return IconComponent ? (
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                <IconComponent className="w-5 h-5" />
              </div>
            ) : null
          })()}
        <div className="flex-1 min-w-0">
          <Typography variant="h4" className="font-semibold text-foreground leading-tight">
            {label}
          </Typography>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col justify-between">
        {/* Value and details */}
        <div className="flex flex-col gap-4">
          <Typography variant="h2" color="primary">
            {showTrends && trendData ? formatValue(trendData.current) : formatValue(value)}
          </Typography>

          <div className="flex flex-col gap-1">
            <Typography variant="p" color="muted">
              {subtitle}
            </Typography>
            {productCount && (
              <Typography variant="p" color="muted">
                {productCount} product{productCount > 1 ? 's' : ''}
              </Typography>
            )}
          </div>
        </div>

        {/* Action button */}
        {isLink && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-secondary text-secondary bg-secondary/5"
            >
              {t('viewDetails')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  const cardClassName = cn('rounded-2xl p-5 border bg-background', className)

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
