'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { Typography } from './typography'

type LogoVariant = 'vertical' | 'horizontal' | 'icon' | 'text' | 'icon-dark'
type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

interface LogoProps {
  variant?: LogoVariant
  size?: LogoSize
  className?: string
  darkMode?: boolean // Force dark/light mode
  href?: string // Make it clickable
}

const sizeMapVertical = {
  sm: 'h-8',
  md: 'h-12',
  lg: 'h-16',
  xl: 'h-24',
}

const sizeMapHorizontal = {
  sm: 'h-6',
  md: 'h-10',
  lg: 'h-12',
  xl: 'h-16',
}

export function Logo({ variant = 'vertical', size = 'md', className, href }: LogoProps) {
  // Get proper aspect ratio dimensions for each variant
  // These match the intrinsic SVG viewBox dimensions
  const getDimensions = (): { width: number; height: number } => {
    switch (variant) {
      case 'icon':
      case 'icon-dark':
        return { width: 600, height: 280 }
      case 'vertical':
        return { width: 600, height: 464 }
      case 'horizontal':
        return { width: 902, height: 180 }
      default:
        return { width: 600, height: 464 }
    }
  }

  const dimensions = getDimensions()
  const sizeClass = variant === 'vertical' ? sizeMapVertical[size] : sizeMapHorizontal[size]

  if (variant === 'text') {
    const textElement = (
      <div className="flex items-center gap-2">
        {/* Light mode icon */}
        <Image
          src="/logos/lifo-logo-icon.svg"
          alt="LIFO Icon"
          className={cn('w-16 h-auto dark:hidden', className)}
          width={600}
          height={280}
          priority
        />
        {/* Dark mode icon */}
        <Image
          src="/logos/lifo-logo-icon-white.svg"
          alt="LIFO Icon"
          className={cn('w-16 h-auto hidden dark:block', className)}
          width={600}
          height={280}
          priority
        />
        <Typography className="font-heading font-normal text-3xl lg:text-4xl" variant="h2">
          LIFO
        </Typography>
      </div>
    )

    if (href) {
      return <Link href={href}>{textElement}</Link>
    }

    return textElement
  }

  // For icon variant, show both and use CSS to toggle
  if (variant === 'icon') {
    const iconElement = (
      <div className="relative">
        {/* Light mode icon */}
        <Image
          src="/logos/lifo-logo-icon.svg"
          alt="LIFO"
          className={cn(sizeClass, 'w-auto dark:hidden', className)}
          priority
          width={dimensions.width}
          height={dimensions.height}
        />
        {/* Dark mode icon */}
        <Image
          src="/logos/lifo-logo-icon-white.svg"
          alt="LIFO"
          className={cn(sizeClass, 'w-auto hidden dark:block', className)}
          priority
          width={dimensions.width}
          height={dimensions.height}
        />
      </div>
    )

    if (href) {
      return (
        <Link href={href} className="inline-block">
          {iconElement}
        </Link>
      )
    }

    return iconElement
  }

  // For icon-dark variant, always show white icon
  if (variant === 'icon-dark') {
    const iconElement = (
      <Image
        src="/logos/lifo-logo-icon-white.svg"
        alt="LIFO"
        className={cn(sizeClass, 'w-auto', className)}
        priority
        width={dimensions.width}
        height={dimensions.height}
      />
    )

    if (href) {
      return (
        <Link href={href} className="inline-block">
          {iconElement}
        </Link>
      )
    }

    return iconElement
  }

  // For vertical variant
  if (variant === 'vertical') {
    const verticalElement = (
      <div className="relative">
        {/* Light mode vertical logo */}
        <Image
          src="/logos/lifo-logo-vertical-light.svg"
          alt="LIFO"
          className={cn(sizeClass, 'w-auto dark:hidden', className)}
          priority
          width={dimensions.width}
          height={dimensions.height}
        />
        {/* Dark mode vertical logo */}
        <Image
          src="/logos/lifo-logo-vertical-black.svg"
          alt="LIFO"
          className={cn(sizeClass, 'w-auto hidden dark:block', className)}
          priority
          width={dimensions.width}
          height={dimensions.height}
        />
      </div>
    )

    if (href) {
      return (
        <Link href={href} className="inline-block">
          {verticalElement}
        </Link>
      )
    }

    return verticalElement
  }

  // For horizontal variant
  if (variant === 'horizontal') {
    const horizontalElement = (
      <div className="relative">
        {/* Light mode horizontal logo */}
        <Image
          src="/logos/lifo-logo-horizontal-light.svg"
          alt="LIFO"
          className={cn(sizeClass, 'w-auto dark:hidden', className)}
          priority
          width={dimensions.width}
          height={dimensions.height}
        />
        {/* Dark mode horizontal logo */}
        <Image
          src="/logos/lifo-logo-horizontal-dark.svg"
          alt="LIFO"
          className={cn(sizeClass, 'w-auto hidden dark:block', className)}
          priority
          width={dimensions.width}
          height={dimensions.height}
        />
      </div>
    )

    if (href) {
      return (
        <Link href={href} className="inline-block">
          {horizontalElement}
        </Link>
      )
    }

    return horizontalElement
  }

  // Default case - use vertical
  const defaultElement = (
    <div className="relative">
      {/* Light mode vertical logo */}
      <Image
        src="/logos/lifo-logo-vertical-light.svg"
        alt="LIFO"
        className={cn(sizeClass, 'w-auto dark:hidden', className)}
        priority
        width={dimensions.width}
        height={dimensions.height}
      />
      {/* Dark mode vertical logo */}
      <Image
        src="/logos/lifo-logo-vertical-black.svg"
        alt="LIFO"
        className={cn(sizeClass, 'w-auto hidden dark:block', className)}
        priority
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {defaultElement}
      </Link>
    )
  }

  return defaultElement
}

// Specific logo components for common use cases
export function NavbarLogo({
  className,
  size = 'md',
  variant = 'vertical',
  href,
}: {
  className?: string
  size?: LogoSize
  variant?: LogoVariant
  href?: string
}) {
  return <Logo variant={variant} size={size} className={className} href={href} />
}

export function AppIcon({ className, size = 'sm' }: { className?: string; size?: LogoSize }) {
  return <Logo variant="icon" size={size} className={className} />
}

export function HeroLogo({ className, size = 'xl' }: { className?: string; size?: LogoSize }) {
  return <Logo variant="vertical" size={size} className={className} />
}

// For loading states or when you need a placeholder
export function LogoSkeleton({ size = 'md' }: { size?: LogoSize }) {
  return <div className={cn(sizeMapVertical[size], 'w-32 bg-muted animate-pulse rounded')} />
}
