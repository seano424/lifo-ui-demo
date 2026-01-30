'use client'

import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type LogoVariant = 'svg' | 'png'
type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

interface LogoProps {
  variant?: LogoVariant
  size?: LogoSize
  className?: string
  darkMode?: boolean // Force dark/light mode
  href?: string // Make it clickable
  priority?: boolean // Image loading priority (default: false)
  withText?: boolean
}

const sizeMap = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-10',
  xl: 'h-12',
}

const textSizeMap = {
  sm: 'text-2xl font-heading font-extrabold',
  md: 'text-3xl font-heading font-extrabold',
  lg: 'text-4xl font-heading font-extrabold',
  xl: 'text-5xl font-heading font-extrabold',
}

export function Logo({
  variant = 'svg',
  size = 'md',
  className,
  href,
  darkMode,
  priority = false,
  withText = false,
}: LogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Determine which image to load based on variant and theme
  const getImageSrc = () => {
    if (variant === 'png') {
      return '/logos/logo.png'
    }

    // SVG variant - theme-aware
    if (!mounted) {
      // Return light mode as default during SSR
      return '/logos/logo-light-theme.svg'
    }

    const isDark = darkMode !== undefined ? darkMode : resolvedTheme === 'dark'
    return isDark ? '/logos/logo-dark-theme.svg' : '/logos/logo-light-theme.svg'
  }

  const sizes = getSizes()
  const sizeClass = sizeMap[size]

  const logoElement = (
    <Image
      src={getImageSrc()}
      alt="LIFO"
      className={cn(sizeClass, 'w-auto', className)}
      priority={priority}
      width={600}
      height={464}
      sizes={sizes}
    />
  )

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          'inline-block',
          withText && 'flex items-center gap-2 font-heading font-extrabold',
        )}
      >
        {logoElement}
        <span className={cn(textSizeMap[size])}>{withText && 'lifo'}</span>
      </Link>
    )
  }

  return (
    <div
      className={cn(
        'inline-block',
        withText && 'flex items-center gap-2 font-heading text-2xl font-extrabold',
      )}
    >
      {logoElement}
      <span className={cn(textSizeMap[size])}>{withText && 'lifo'}</span>
    </div>
  )
}

// Specific logo components for common use cases
export function NavbarLogo({
  className,
  size = 'md',
  variant = 'svg',
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
  return <Logo variant="svg" size={size} className={className} />
}

export function HeroLogo({ className, size = 'xl' }: { className?: string; size?: LogoSize }) {
  return <Logo variant="svg" size={size} className={className} />
}

// For loading states or when you need a placeholder
export function LogoSkeleton({ size = 'md' }: { size?: LogoSize }) {
  return <div className={cn(sizeMap[size], 'w-32 bg-muted animate-pulse rounded')} />
}
