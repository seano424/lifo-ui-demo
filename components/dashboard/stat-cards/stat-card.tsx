import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { badgeVariants } from '@/components/ui/badge'
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
  href?: string
  hrefLabel?: string
}

export function StatCard({ label, value, subtitle, trend, href, hrefLabel }: StatCardProps) {
  return (
    <Card className="relative cursor-default p-5 transition-all duration-200 flex flex-col gap-3 flex-1 bg-card">
      <Typography variant="p" color="primary">
        {label}
      </Typography>
      <div className="flex flex-col gap-1 min-h-24">
        <Typography variant="h4">{value}</Typography>
        <Typography variant="h5" color="muted">
          {subtitle}
        </Typography>
      </div>
      {trend && <TrendBadge {...trend} />}
      {href && !trend && (
        <Link href={href} className={cn(badgeVariants({ variant: 'secondary' }), 'w-full')}>
          {hrefLabel}
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      )}
    </Card>
  )
}
