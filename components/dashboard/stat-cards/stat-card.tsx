import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TrendBadge } from './trend-badge'
import { Typography } from '@/components/ui/typography'

interface TrendData {
  direction: 'up' | 'down'
  value: string
  isPositive?: boolean
}

interface StatCardProps {
  label: string
  value: string | number
  subtitle: string
  trend?: TrendData
  icon: LucideIcon
  accentClass: string
  isLoading?: boolean
}

export function StatCard({
  label,
  value,
  subtitle,
  trend,
  // icon: Icon,
  accentClass,
  isLoading = false,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card className="relative cursor-default p-5 transition-all duration-200">
        <div className="mb-3 flex items-start justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className={cn('h-10 w-10 rounded-xl', accentClass)} />
        </div>
        <Skeleton className="mb-1 h-9 w-20" />
        <Skeleton className="mb-3 h-3 w-32" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </Card>
    )
  }

  return (
    <Card className="relative cursor-default p-5 transition-all duration-200 flex flex-col gap-3 flex-1">
      {/* <Icon className="h-6 w-6" aria-hidden="true" /> */}
      <Typography variant="p" color="muted">
        {label}
      </Typography>
      <Typography variant="h4">{value}</Typography>
      <Typography variant="p" color="muted">
        {subtitle}
      </Typography>
      {trend && <TrendBadge {...trend} />}
    </Card>
  )
}
