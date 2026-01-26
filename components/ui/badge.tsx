import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center font-bold font-heading justify-center gap-1.5 rounded-4xl capitalize whitespace-nowrap transition-colors duration-200 ease-in-out [&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
        primary: 'bg-primary-50 text-primary-600',
        secondary: 'bg-secondary text-white',
        destructive: 'bg-red-100 text-red-900 dark:bg-red-900/20 dark:text-red-300',
        success: 'bg-green-100 text-green-900 dark:bg-green-900/20 dark:text-green-300',
        warning: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-300',
        info: 'bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300',
        outline: 'border border-input bg-background text-foreground',
        ghost: 'text-foreground',
        subtle: 'bg-primary-50 text-primary-900 dark:bg-primary-900/10 dark:text-primary-300',
        subtleSecondary:
          'bg-secondary-50 text-secondary-900 dark:bg-secondary-900/10 dark:text-secondary-300',
        cyan: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/20 dark:text-cyan-300',
        gray: 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100',
        blue: 'bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300',
        green: 'bg-primary-100 text-primary-900 dark:bg-primary-900/20 dark:text-primary-300',
        invertedSecondary: 'bg-secondary-900 text-white dark:bg-secondary-700 dark:text-white',
        // Interactive variants with hover states
        interactivePrimary:
          'bg-primary-100 text-primary-900 hover:bg-primary-200 dark:bg-primary-900/20 dark:text-primary-300 dark:hover:bg-primary-900/30 cursor-pointer',
        interactiveSecondary:
          'bg-secondary-100 text-secondary-900 hover:bg-secondary-200 dark:bg-secondary-900/20 dark:text-secondary-300 dark:hover:bg-secondary-900/30 cursor-pointer',
        interactiveDestructive:
          'bg-red-100 text-red-900 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30 cursor-pointer',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        default: 'px-6 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
        xl: 'px-8 py-4 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props} />
  },
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
