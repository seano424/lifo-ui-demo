import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { ChevronRightIcon, Loader2 } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'rounded-lg transition-all duration-100 focus:outline-none disabled:opacity-50 disabled:pointer-events-none overflow-hidden cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors duration-200 ease-in-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Enhanced variants using new color palettes
        default:
          'bg-primary-900 hover:bg-primary-800 dark:bg-primary-900/80 dark:hover:bg-primary-900 text-white',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 dark:hover:bg-destructive dark:text-destructive-foreground',
        subtleDestructive: 'text-destructive hover:bg-destructive-100',
        outline: 'border border-input bg-background shadow-xs hover:border-muted',
        secondary: 'bg-secondary-900 shadow-xs hover:bg-secondary-800 text-white',
        lime: 'bg-lime-200 hover:bg-lime-200/80 text-black dark:bg-lime-300 dark:hover:bg-lime-300/80',
        ghost:
          'hover:text-primary-800 dark:hover:bg-primary-900/0 dark:text-foreground font-normal w-fit',
        subtleTertiary:
          'bg-primary-50 text-primary-800 dark:bg-background/10 dark:text-primary-300',
        link: 'text-primary-800 underline-offset-4 hover:underline dark:text-primary-300',

        // New subtle variants using lighter shades
        subtle:
          'bg-primary-50 text-primary-800 dark:bg-primary-900/10 dark:text-foreground font-normal w-fit',
        subtleSecondary:
          'bg-secondary-400/15 text-secondary-700 dark:bg-secondary-400/10 dark:text-secondary-300',
        sandRounded: 'bg-sand-foreground rounded-full',

        // Brand variants (preserved for backward compatibility)
        brand:
          'bg-brand-primary hover:bg-brand-primary/80 dark:hover:bg-brand-primary/60 text-white',
        brandOutline:
          'border border-brand-primary bg-background shadow-xs hover:bg-brand-primary/10 hover:text-brand-primary dark:hover:bg-brand-primary/10 dark:hover:text-brand-primary',
        brandSecondaryOutline:
          'border border-brand-secondary bg-background shadow-xs hover:bg-brand-secondary/10 dark:hover:bg-brand-secondary/10',
        black: 'bg-black hover:bg-black/90 text-white',
        gray: 'bg-gray-50 hover:bg-gray-50/90 dark:bg-secondary-100/10 dark:hover:bg-opacity-20',
        subtleGray:
          'bg-gray-100 text-foreground hover:bg-gray-100/90 dark:bg-secondary-900/10 dark:hover:bg-secondary-900/20',
        white:
          'bg-white text-primary-800 hover:bg-white/90 dark:bg-primary-900 dark:text-primary-100 dark:hover:bg-primary-900/90',
      },
      size: {
        xs: 'px-4 py-1.5 text-sm',
        sm: 'px-4 py-2 text-sm',
        default: 'px-6 py-2.5 text-sm',
        lg: 'px-4 sm:px-6 py-3 sm:py-3.5 sm:text-base text-sm',
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
  hasArrowUpIcon?: boolean
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
      hasArrowUpIcon = false,
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
      <span className="contents">
        <Loader2 className="animate-spin" />
        {loadingText || 'Loading...'}
      </span>
    ) : (
      <span className="contents">
        {children}
        {hasArrowUpIcon && (
          <ChevronRightIcon className="w-5 h-5 -rotate-45 transition-transform duration-300 ease-in-out group-hover:translate-x-px group-hover:-translate-y-1 -translate-y-px" />
        )}
      </span>
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
              hasArrowUpIcon && 'group',
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
              hasArrowUpIcon && 'group',
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
        className={cn(buttonVariants({ variant, size, className }), hasArrowUpIcon && 'group')}
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
