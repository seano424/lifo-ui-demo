'use client'

import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
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

export function Logo({ variant = 'vertical', size = 'md', className, href, darkMode }: LogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Get responsive sizes for better mobile performance
  const getSizes = (): string => {
    switch (size) {
      case 'sm':
        return '(max-width: 640px) 32px, (max-width: 768px) 40px, 48px'
      case 'md':
        return '(max-width: 640px) 48px, (max-width: 768px) 64px, 80px'
      case 'lg':
        return '(max-width: 640px) 64px, (max-width: 768px) 80px, 96px'
      case 'xl':
        return '(max-width: 640px) 80px, (max-width: 768px) 96px, 128px'
      default:
        return '(max-width: 640px) 48px, (max-width: 768px) 64px, 80px'
    }
  }

  // Determine which image to load based on theme
  const getImageSrc = () => {
    if (!mounted) {
      // Return light mode as default during SSR
      switch (variant) {
        case 'icon':
        case 'text':
          return '/logos/lifo-logo-icon.svg'
        case 'vertical':
          return '/logos/lifo-logo-vertical-light.svg'
        case 'horizontal':
          return '/logos/lifo-logo-horizontal-light.svg'
        case 'icon-dark':
          return '/logos/lifo-logo-icon-white.svg'
        default:
          return '/logos/lifo-logo-vertical-light.svg'
      }
    }

    const isDark = darkMode !== undefined ? darkMode : resolvedTheme === 'dark'

    switch (variant) {
      case 'icon':
      case 'text':
        return isDark ? '/logos/lifo-logo-icon-white.svg' : '/logos/lifo-logo-icon.svg'
      case 'vertical':
        return isDark
          ? '/logos/lifo-logo-vertical-black.svg'
          : '/logos/lifo-logo-vertical-light.svg'
      case 'horizontal':
        return isDark
          ? '/logos/lifo-logo-horizontal-dark.svg'
          : '/logos/lifo-logo-horizontal-light.svg'
      case 'icon-dark':
        return '/logos/lifo-logo-icon-white.svg'
      default:
        return isDark
          ? '/logos/lifo-logo-vertical-black.svg'
          : '/logos/lifo-logo-vertical-light.svg'
    }
  }

  const dimensions = getDimensions()
  const sizes = getSizes()
  const sizeClass = variant === 'vertical' ? sizeMapVertical[size] : sizeMapHorizontal[size]

  if (variant === 'text') {
    const textElement = (
      <div className="flex items-center gap-2">
        <Image
          src={getImageSrc()}
          alt="LIFO Icon"
          className={cn('w-16 h-auto', className)}
          width={600}
          height={280}
          sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, 96px"
          priority
        />
        <Typography className="font-heading font-bold bold text-3xl lg:text-4xl" variant="h2">
          LIFO
        </Typography>
      </div>
    )

    if (href) {
      return <Link href={href}>{textElement}</Link>
    }

    return textElement
  }

  // For icon variant, load only the required theme image
  if (variant === 'icon') {
    const iconElement = (
      <Image
        src={getImageSrc()}
        alt="LIFO"
        className={cn(sizeClass, 'w-auto', className)}
        priority
        width={dimensions.width}
        height={dimensions.height}
        sizes={sizes}
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
        sizes={sizes}
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

  // For vertical variant, load only the required theme image
  if (variant === 'vertical') {
    const verticalElement = (
      <Image
        src={getImageSrc()}
        alt="LIFO"
        className={cn(sizeClass, 'w-auto', className)}
        priority
        width={dimensions.width}
        height={dimensions.height}
        sizes={sizes}
      />
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

  // For horizontal variant, load only the required theme image
  if (variant === 'horizontal') {
    const horizontalElement = (
      <Image
        src={getImageSrc()}
        alt="LIFO"
        className={cn(sizeClass, 'w-auto', className)}
        priority
        width={dimensions.width}
        height={dimensions.height}
        sizes={sizes}
      />
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

  // Default case - use vertical, load only the required theme image
  const defaultElement = (
    <Image
      src={getImageSrc()}
      alt="LIFO"
      className={cn(sizeClass, 'w-auto', className)}
      priority
      width={dimensions.width}
      height={dimensions.height}
      sizes={sizes}
    />
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
