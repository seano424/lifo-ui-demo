import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const typographyVariants = cva('', {
  variants: {
    variant: {
      h1: 'scroll-m-20 text-4xl sm:text-5xl font-bold tracking-tight md:text-6xl xl:text-7xl font-heading leading-none',
      h2: 'scroll-m-20 text-3xl font-bold tracking-tight font-heading leading-none',
      h3: 'scroll-m-20 text-2xl font-bold tracking-tight font-heading leading-none',
      h4: 'scroll-m-20 text-xl font-bold tracking-tight font-heading leading-none',
      h5: 'scroll-m-20 text-lg tracking-tight leading-none',
      p: 'text-base leading-5 font-sans',
      muted: 'text-sm text-muted-foreground font-sans',
      small: 'text-sm font-sans',
      blockquote: 'mt-6 border-l-2 pl-6 italic font-sans',
      code: 'rounded-2xl bg-muted px-1.5 py-1 font-mono text-sm font-bold font-sans',
      extraSmall: 'text-xs font-sans',
    },
    color: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      destructive: 'text-destructive',
    },
  },
  defaultVariants: {
    variant: 'p',
    color: 'default',
  },
})

export type TypographyProps = {
  asChild?: boolean
  as?: React.ElementType
} & Omit<React.HTMLAttributes<HTMLElement>, 'color'> &
  VariantProps<typeof typographyVariants>

const variantElementMap: Record<string, React.ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  p: 'p',
  blockquote: 'blockquote',
  code: 'code',
  small: 'p',
  muted: 'p',
  extraSmall: 'p',
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, color, asChild = false, as: CompProp, ...props }, ref) => {
    // Use provided 'as' prop, or infer from variant, or default to 'span'
    const Comp = asChild ? Slot : CompProp || (variant && variantElementMap[variant]) || 'span'
    return (
      <Comp
        className={cn(typographyVariants({ variant, color, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)

Typography.displayName = 'Typography'

export { Typography, typographyVariants }
