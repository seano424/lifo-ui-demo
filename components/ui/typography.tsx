import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const typographyVariants = cva('', {
  variants: {
    variant: {
      h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
      h2: 'scroll-m-20 text-3xl font-semibold tracking-tight',
      h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
      h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
      p: 'text-base leading-7',
      muted: 'text-sm text-muted-foreground',
      small: 'text-sm font-medium',
      blockquote: 'mt-6 border-l-2 pl-6 italic',
      code: 'rounded bg-muted px-1.5 py-1 font-mono text-sm font-semibold',
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

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  asChild?: boolean
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, color, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'p'

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




// example usage
import { Typography } from '@/components/ui/typography'

export default function Demo() {
  return (
    <div>
      <Typography variant="h1">This is a Heading 1</Typography>
      <Typography variant="p" color="muted">
        This is a muted paragraph.
      </Typography>
      <Typography variant="blockquote">“Code is like humor. When you have to explain it, it’s bad.”</Typography>
    </div>
  )
}
