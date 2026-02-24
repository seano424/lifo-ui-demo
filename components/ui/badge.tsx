import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center capitalize justify-center gap-x-1.5 rounded-md whitespace-nowrap forced-colors:outline [&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-zinc-600/10 text-zinc-700 dark:bg-white/5 dark:text-zinc-400',
        primary: 'bg-primary-400/15 text-primary-700 dark:bg-primary-400/10 dark:text-primary-300',
        secondary:
          'bg-secondary-400/15 text-secondary-700 dark:bg-secondary-400/10 dark:text-secondary-300',
        success: 'bg-lime-400/20 text-lime-700 dark:bg-lime-400/10 dark:text-lime-300',
        danger: 'bg-red-200/15 text-red-400 dark:bg-red-400/10 dark:text-red-400',
        destructive: 'bg-red-400/15 text-red-700 dark:bg-red-400/10 dark:text-red-300',
        outline:
          'border border-gray-300 dark:border-gray-600 bg-transparent text-secondary-900 dark:text-secondary-100',
        ghost: 'bg-transparent text-secondary-900 dark:text-secondary-100 border-none',
        muted:
          'bg-muted-foreground/10 text-muted-foreground dark:bg-muted-foreground/10 dark:text-muted-foreground',
        plain: 'bg-transparent text-secondary-900 dark:text-secondary-100 border-none',
        plainRounded:
          'bg-transparent text-secondary-900 dark:text-secondary-100 border-none rounded-full',
        elevated:
          'bg-gray-100/60 dark:bg-secondary/10 backdrop-blur-sm text-secondary-900 dark:text-secondary-100 rounded-lg',
        invertedSecondary: 'bg-secondary-700 text-white',
        primaryRounded:
          'bg-primary-400/15 text-primary-700 dark:bg-primary-400/10 dark:text-primary-300 rounded-full',
        mutedRounded: 'bg-muted text-foreground rounded-full',
        secondaryRounded:
          'bg-secondary-400/15 text-secondary-700 dark:bg-secondary-400/10 dark:text-secondary-300 rounded-full',
        successRounded: 'bg-lime-100 rounded-full dark:text-black',
        dangerRounded: 'bg-red-100 rounded-full',
        destructiveRounded:
          'bg-red-400/15 text-red-700 dark:bg-red-400/10 dark:text-red-300 rounded-full',
        outlineRounded:
          'border border-gray-300 dark:border-gray-600 bg-transparent text-secondary-900 dark:text-secondary-100 rounded-full',
        ghostRounded:
          'bg-transparent text-secondary-900 dark:text-secondary-100 border-none rounded-full',
        elevatedRounded:
          'bg-gray-100/60 dark:bg-secondary/10 backdrop-blur-sm text-secondary-900 dark:text-secondary-100 rounded-lg rounded-full',
        sandRounded: 'bg-[#F6F1EC] rounded-full',
        invertedSecondaryRounded: 'bg-secondary-700 text-white rounded-full',
        invertedPrimaryRounded: 'bg-primary-700 text-white rounded-full',
        invertedSuccessRounded: 'bg-lime-700 text-white rounded-full',
        invertedDangerRounded: 'bg-red-700 text-white rounded-full',
        invertedDestructiveRounded: 'bg-red-300 text-white rounded-full',
        invertedOutlineRounded:
          'border border-gray-300 dark:border-gray-600 bg-transparent text-secondary-900 dark:text-secondary-100 rounded-full',
        invertedGhostRounded:
          'bg-transparent text-secondary-900 dark:text-secondary-100 border-none rounded-full',
        invertedElevatedRounded:
          'bg-gray-100/60 dark:bg-secondary/10 backdrop-blur-sm text-secondary-900 dark:text-secondary-100 rounded-lg rounded-full',
        invertedInvertedSecondaryRounded: 'bg-secondary-700 text-white rounded-full',
        invertedInvertedPrimaryRounded: 'bg-primary-700 text-white rounded-full',
        invertedInvertedSuccessRounded: 'bg-lime-700 text-white rounded-full',
        invertedInvertedDangerRounded: 'bg-red-700 text-white rounded-full',
        invertedInvertedOutlineRounded:
          'border border-gray-300 dark:border-gray-600 bg-transparent text-secondary-900 dark:text-secondary-100 rounded-full',
      },
      size: {
        compact: 'px-1.5 py-0.5 text-sm/5 sm:text-xs/5 font-medium',
        sm: 'px-2.5 py-1 text-xs font-medium',
        default: 'px-3 py-1.5 text-sm font-medium',
        lg: 'px-6 py-2.5 text-sm',
        xl: 'px-8 py-4 text-lg',
      },
      font: {
        default: 'tracking-tight',
        mono: 'font-mono tracking-tight',
        heading: 'font-extrabold',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      font: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, font, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, font }), className)}
        {...props}
      />
    )
  },
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
