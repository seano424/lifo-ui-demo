import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center cursor-default rounded-2xl px-2.5 py-1.5 text-sm',
  {
    variants: {
      variant: {
        default:
          'bg-gray-100/50 text-gray-800 border-gray-500 dark:bg-secondary-900 dark:text-gray-200 dark:border-gray-500',
        primary:
          'bg-primary-100/50 text-primary-900 border-primary-500 dark:bg-primary-900 dark:text-primary-100 dark:border-primary-500',
        secondary:
          'bg-secondary-50/50 text-secondary-800 border-secondary-500 dark:bg-secondary-700 dark:text-secondary-100 dark:border-secondary-500',
        destructive:
          'bg-red-50/50 text-red-800 border-red-500 dark:bg-red-700 dark:text-red-100 dark:border-red-500',
        outline: 'text-foreground border border-primary',
        ghost: 'text-foreground border-none',
        cyan: 'bg-cyan-100/50 text-cyan-800 border-cyan-500 dark:bg-cyan-700 dark:text-cyan-100 dark:border-cyan-500',
        gray: 'bg-gray-100/50 text-muted-foreground/90 border-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-500',
        blue: 'bg-blue-100/50 text-blue-800 border-blue-500 dark:bg-blue-700 dark:text-blue-100 dark:border-blue-500',
        green:
          'bg-primary-100/50 text-primary-800 border-primary-500 dark:bg-primary-700 dark:text-primary-100 dark:border-primary-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
