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
    sidebar: 'min-w-6 bg-red-400 font-normal text-white rounded-full font-medium',
    navbar: 'min-w-8 bg-red-400 font-normal text-white rounded-full font-medium text-sm',
    default: 'min-w-6 bg-red-400 font-normal text-white rounded-full font-medium',
  }

  return (
    <span className={cn(baseClasses, variantClasses[variant], className)}>
      {count > 99 ? '99+' : count}
    </span>
  )
}
