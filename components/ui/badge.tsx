import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center cursor-default rounded-2xl border-2 px-2.5 py-1.5 text-xs',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800 border-gray-500',
        primary: 'bg-primary-50 text-primary-900 border-primary-500',
        secondary: 'bg-secondary-50 text-secondary-800 border-secondary-500',
        destructive: 'bg-red-50 text-red-800 border-red-500',
        outline: 'text-foreground',
        ghost: 'text-foreground border-none',
        cyan: 'bg-cyan-100 text-cyan-800 border-cyan-500',
        gray: 'bg-gray-100 text-gray-800 border-gray-500',
        blue: 'bg-blue-100 text-blue-800 border-blue-500',
        green: 'bg-primary-100 text-primary-800 border-primary-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
