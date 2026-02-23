import * as React from 'react'

import { cn } from '@/lib/utils'
import { Typography, type TypographyProps } from './typography'

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  shadow?: 'none' | 'primary' | 'secondary'
}

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & CardProps>(
  ({ className, shadow = 'none', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl flex flex-col gap-2 text-card-foreground',
        className,
        // {
        //   'shadow-primary-300 shadow-xl': shadow === 'primary',
        //   'shadow-secondary-300 shadow-xl': shadow === 'secondary',
        // },
      )}
      {...props}
    />
  ),
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 px-6 pt-6 pb-2', className)} {...props} />
  ),
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLElement, Omit<TypographyProps, 'variant'>>(
  ({ className, ...props }, ref) => (
    <Typography
      variant="h4"
      ref={ref}
      className={cn('leading-none tracking-tight', className)}
      {...props}
    />
  ),
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLElement, Omit<TypographyProps, 'variant'>>(
  ({ className, ...props }, ref) => (
    <Typography variant="small" ref={ref} className={className} {...props} />
  ),
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0 flex flex-col gap-4', className)} {...props} />
  ),
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
