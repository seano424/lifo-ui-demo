'use client'

import * as LabelPrimitive from '@radix-ui/react-label'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'
import { Typography, type TypographyProps } from './typography'

interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  required?: boolean
  variant?: TypographyProps['variant']
}

const labelVariants = cva('peer-disabled:cursor-not-allowed peer-disabled:opacity-70')

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  LabelProps & VariantProps<typeof labelVariants>
>(({ className, required, variant = 'small', ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants())} {...props}>
    <Typography variant={variant} color="muted" className={className}>
      {props.children}
      {required && <span className="text-destructive">*</span>}
    </Typography>
  </LabelPrimitive.Root>
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
