import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import Link from 'next/link'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex font-sans items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-200 ease-in-out focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:hover:text-brand-secondary dark:hover:bg-brand-secondary/10',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:text-secondary',
        link: 'text-primary underline-offset-4 hover:underline',
        brand: 'bg-brand-primary text-white shadow-sm hover:bg-brand-primary/90',
        brandSecondary: 'bg-brand-secondary text-white shadow-sm hover:bg-brand-secondary/90',
        brandOutline:
          'border border-brand-primary bg-background shadow-xs hover:bg-brand-primary/10 hover:text-brand-primary dark:hover:bg-brand-secondary/10 dark:hover:text-brand-secondary',
        brandSecondaryOutline:
          'border border-brand-secondary bg-background shadow-xs hover:bg-brand-secondary/10 hover:text-brand-secondary dark:hover:bg-brand-primary/10 dark:hover:text-brand-primary',
      },
      size: {
        default: 'px-4 py-2 text-sm',
        sm: 'px-4 py-2 text-xs',
        lg: 'px-8 py-2',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement>
type ButtonOnlyProps =
  | 'disabled'
  | 'form'
  | 'formAction'
  | 'formEncType'
  | 'formMethod'
  | 'formNoValidate'
  | 'formTarget'
  | 'name'
  | 'type'
  | 'value'

type ButtonPropsBase = {
  asChild?: boolean
  asLink?: boolean
  href?: string
  children?: React.ReactNode
  onClick?: (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement, MouseEvent>) => void
} & VariantProps<typeof buttonVariants>

export type ButtonProps =
  | (ButtonPropsBase & React.ButtonHTMLAttributes<HTMLButtonElement> & { asLink?: false })
  | (ButtonPropsBase & Omit<AnchorProps, ButtonOnlyProps> & { asLink: true; href: string })

const Button = React.forwardRef<HTMLButtonElement & HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      className,
      variant = 'default',
      size,
      asChild = false,
      asLink = false,
      href,
      children,
      ...rest
    } = props as ButtonProps & { href?: string }

    if (asLink && href) {
      const isInternal = href.startsWith('/')
      const anchorProps = rest as AnchorProps
      if (isInternal) {
        // Internal: use Next.js Link directly
        return (
          <Link
            href={href}
            className={cn(buttonVariants({ variant, size, className }))}
            ref={ref as React.Ref<HTMLAnchorElement>}
            {...anchorProps}
          >
            {children}
          </Link>
        )
      } else {
        // External: use <a>
        return (
          <a
            href={href}
            className={cn(buttonVariants({ variant, size, className }))}
            ref={ref as React.Ref<HTMLAnchorElement>}
            {...anchorProps}
          >
            {children}
          </a>
        )
      }
    }
    const Comp = asChild ? Slot : 'button'
    const buttonProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...buttonProps}>
        {children}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
