import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'rounded-lg transition-transform duration-75 focus:outline-none disabled:opacity-50 disabled:pointer-events-none overflow-hidden active:scale-[0.97] cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors duration-200 ease-in-out focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Enhanced variants using new color palettes
        default:
          'bg-primary-900 text-white shadow-sm hover:bg-primary-800 dark:bg-primary-700 dark:hover:bg-primary-600',
        destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-xs hover:bg-primary-50 hover:text-primary-900 dark:hover:bg-primary-900/10 dark:hover:text-primary-300',
        secondary:
          'bg-secondary-900 text-white shadow-xs hover:bg-secondary-800 dark:bg-secondary-700 dark:hover:bg-secondary-600',
        ghost:
          'hover:bg-primary-50 hover:text-primary-900 dark:hover:bg-primary-900/10 dark:hover:text-primary-300',
        link: 'text-primary-900 underline-offset-4 hover:underline dark:text-primary-300',

        // New subtle variants using lighter shades
        subtle:
          'bg-primary-600 text-white shadow-sm hover:bg-primary-800 dark:bg-primary-700 dark:hover:bg-primary-600',
        subtleSecondary:
          'bg-secondary-100 text-sky-700 shadow-xs hover:bg-secondary-200 dark:bg-secondary-900/20 dark:text-secondary-300 dark:hover:bg-secondary-900/30',
        subtleTertiary:
          'bg-tertiary-100 text-tertiary-900 shadow-xs hover:bg-tertiary-200 dark:bg-tertiary-900/20 dark:text-tertiary-300 dark:hover:bg-tertiary-900/30',

        // Brand variants (preserved for backward compatibility)
        brand:
          'bg-brand-primary text-white shadow-sm hover:bg-primary-800 dark:hover:bg-primary-600',
        brandOutline:
          'border border-brand-primary bg-background shadow-xs hover:bg-primary-50 hover:text-brand-primary dark:hover:bg-primary-900/10 dark:hover:text-primary-300',
        brandSecondaryOutline:
          'border border-brand-secondary bg-background shadow-xs hover:bg-secondary-50 hover:text-brand-secondary dark:hover:bg-secondary-900/10 dark:hover:text-secondary-300',
        black: 'bg-black text-white shadow-sm hover:bg-black/90',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs',
        default: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
        xl: 'px-8 py-4 text-lg',
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
  loading?: boolean
  loadingText?: string
  onClick?: (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement, MouseEvent>) => void
} & VariantProps<typeof buttonVariants>

export type ButtonProps =
  | (ButtonPropsBase & React.ButtonHTMLAttributes<HTMLButtonElement> & { asLink?: false })
  | (ButtonPropsBase & Omit<AnchorProps, ButtonOnlyProps> & { asLink: true; href: string })

const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      className,
      variant = 'default',
      size,
      asChild = false,
      asLink = false,
      href,
      children,
      loading = false,
      loadingText,
      disabled,
      ...rest
    } = props as ButtonProps & {
      href?: string
      loading?: boolean
      loadingText?: string
      disabled?: boolean
    }

    // Show loading content when loading is true
    const content = loading ? (
      <>
        <Loader2 className="animate-spin" />
        {loadingText || 'Loading...'}
      </>
    ) : (
      children
    )

    // Disable button when loading
    const isDisabled = disabled || loading

    if (asLink && href) {
      const isInternal = href.startsWith('/')
      const anchorProps = rest as AnchorProps

      if (isInternal) {
        // Internal: use Next.js Link directly
        return (
          <Link
            href={href}
            className={cn(
              buttonVariants({ variant, size, className }),
              isDisabled && 'opacity-50 pointer-events-none',
            )}
            ref={ref as React.Ref<HTMLAnchorElement>}
            {...anchorProps}
          >
            {content}
          </Link>
        )
      } else {
        // External: use <a> with security attributes
        return (
          <a
            href={href}
            className={cn(
              buttonVariants({ variant, size, className }),
              isDisabled && 'opacity-50 pointer-events-none',
            )}
            ref={ref as React.Ref<HTMLAnchorElement>}
            rel="noopener noreferrer"
            target="_blank"
            {...anchorProps}
          >
            {content}
          </a>
        )
      }
    }

    const Comp = asChild ? Slot : 'button'
    const buttonProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref as React.Ref<HTMLButtonElement>}
        disabled={isDisabled}
        {...buttonProps}
      >
        {content}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
