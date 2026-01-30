import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-lg whitespace-nowrap transition-colors duration-200 ease-in-out [&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-gray-100/60 backdrop-blur-sm text-secondary-900',
        primary: 'bg-primary-100/20 text-primary-700',
        secondary: 'bg-secondary-100/20 text-secondary-700',
        outline: 'border border-gray-300 bg-transparent text-secondary-900',
        destructive: 'bg-red-100/60 text-red-700',
        invertedSecondary: 'bg-secondary-700 text-white',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        default: 'px-6 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
        xl: 'px-8 py-4 text-lg',
      },
      font: {
        default: 'font-medium tracking-tight',
        mono: 'font-mono font-medium tracking-tight',
        heading: 'font-heading font-extrabold',
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
