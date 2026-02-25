import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TrendBadgeProps {
  value: string
  direction: 'up' | 'down'
  isPositive?: boolean
}

export function TrendBadge({ value, direction, isPositive = false }: TrendBadgeProps) {
  const Icon = direction === 'up' ? ArrowUpRight : ArrowDownRight

  return (
    <Badge variant={isPositive ? 'success' : 'secondary'}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {value}
    </Badge>
  )
}
