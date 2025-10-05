'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
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

export function Logo({ variant = 'vertical', size = 'md', className, darkMode, href }: LogoProps) {
  const { theme } = useTheme()

  // Determine which logo to show based on theme
  const isDark = darkMode ?? theme === 'dark'

  if (variant === 'text') {
    const textElement = (
      <div className="flex items-center gap-2">
        <Image
          src="/logos/lifo-logo-icon.svg"
          alt="LIFO Icon"
          className="w-16 h-auto"
          width={600}
          height={280}
          priority
        />
        <Typography className="font-black font-heading text-3xl lg:text-4xl" variant="h2">
          Lifo
        </Typography>
      </div>
    )

    if (href) {
      return <Link href={href}>{textElement}</Link>
    }

    return textElement
  }

  const getLogoPath = () => {
    switch (variant) {
      case 'icon':
        return '/logos/lifo-logo-icon.svg'
      case 'icon-dark':
        return '/logos/lifo-logo-icon-white.svg'
      case 'vertical':
        return isDark ? '/logos/lifo-logo-vertical-dark.svg' : '/logos/lifo-logo-vertical-light.svg'
      case 'horizontal':
        return isDark
          ? '/logos/lifo-logo-horizontal-dark.svg'
          : '/logos/lifo-logo-horizontal-light.svg'
      default:
        return '/logos/lifo-logo.svg'
    }
  }

  // Get proper dimensions for each variant
  const getDimensions = () => {
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

  const logoElement = (
    <Image
      src={getLogoPath()}
      alt="LIFO"
      className={cn(
        variant === 'vertical' ? sizeMapVertical[size] : sizeMapHorizontal[size],
        'w-auto transition-opacity duration-200',
        className,
      )}
      priority
      width={dimensions.width}
      height={dimensions.height}
    />
  )

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {logoElement}
      </Link>
    )
  }

  return logoElement
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
