'use client'

import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

type LogoVariant = 'vertical' | 'horizontal' | 'icon'
type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

interface LogoProps {
  variant?: LogoVariant
  size?: LogoSize
  className?: string
  darkMode?: boolean // Force dark/light mode
  href?: string // Make it clickable
}

const sizeMap = {
  sm: 'h-8',
  md: 'h-12',
  lg: 'h-16',
  xl: 'h-24',
}

export function Logo({
  variant = 'vertical',
  size = 'md',
  className,
  darkMode,
  href = '/',
}: LogoProps) {
  const { theme } = useTheme()

  // Determine which logo to show based on theme
  const isDark = darkMode ?? theme === 'dark'
  // public/logos/lifo-logo-icon.svg
  // public/logos/lifo-logo-horizontal-dark.svg
  // public/logos/lifo-logo-horizontal-light.svg
  // public/logos/lifo-logo-vertical-dark.svg
  // public/logos/lifo-logo-vertical-light.svg

  const getLogoPath = () => {
    switch (variant) {
      case 'icon':
        return '/logos/lifo-logo-icon.svg'
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

  const logoElement = (
    <img
      src={getLogoPath()}
      alt="LIFO"
      className={cn(
        sizeMap[size],
        'w-auto transition-opacity duration-200 hover:opacity-80',
        className,
      )}
    />
  )

  if (href) {
    return (
      <a href={href} className="inline-block">
        {logoElement}
      </a>
    )
  }

  return logoElement
}

// Specific logo components for common use cases
export function NavbarLogo({ className }: { className?: string }) {
  return <Logo variant="vertical" size="md" className={className} />
}

export function AppIcon({ className }: { className?: string }) {
  return <Logo variant="icon" size="sm" className={className} />
}

export function HeroLogo({ className }: { className?: string }) {
  return <Logo variant="vertical" size="xl" className={className} />
}

// For loading states or when you need a placeholder
export function LogoSkeleton({ size = 'md' }: { size?: LogoSize }) {
  return <div className={cn(sizeMap[size], 'w-32 bg-muted animate-pulse rounded')} />
}
