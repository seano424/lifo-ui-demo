import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const typographyVariants = cva('', {
  variants: {
    variant: {
      h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl font-heading',
      h2: 'scroll-m-20 text-3xl font-semibold tracking-tight font-heading',
      h3: 'scroll-m-20 text-2xl font-semibold tracking-tight font-heading',
      h4: 'scroll-m-20 text-xl font-semibold tracking-tight font-heading',
      p: 'text-base leading-5 font-sans',
      muted: 'text-sm text-muted-foreground font-sans',
      small: 'text-sm font-sans',
      blockquote: 'mt-6 border-l-2 pl-6 italic font-sans',
      code: 'rounded bg-muted px-1.5 py-1 font-mono text-sm font-semibold font-sans',
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

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  (
    { className, variant, color, asChild = false, as: CompProp, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : CompProp || 'p'
    return (
      <Comp
        className={cn(typographyVariants({ variant, color, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

Typography.displayName = 'Typography'

export { Typography, typographyVariants }
