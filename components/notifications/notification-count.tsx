'use client'

import { cn } from '@/lib/utils'

interface NotificationCountProps {
  count: number
  className?: string
  variant?: 'sidebar' | 'navbar' | 'default'
}

export function NotificationCount({
  count,
  className,
  variant = 'default',
}: NotificationCountProps) {
  if (count <= 0) return null

  const baseClasses = 'flex items-center justify-center rounded text-xs text-white aspect-square'

  const variantClasses = {
    sidebar: 'min-w-6 bg-secondary-900/10 text-foreground',
    navbar:
      'min-w-7 bg-secondary-900/10 text-foreground border border-white px-1 text-[10px] shadow-lg',
    default: 'min-w-6 bg-secondary-900/10 text-foreground',
  }

  return (
    <span className={cn(baseClasses, variantClasses[variant], className)}>
      {count > 99 ? '99+' : count}
    </span>
  )
}
