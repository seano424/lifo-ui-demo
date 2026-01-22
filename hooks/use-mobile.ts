import * as React from 'react'

const BREAKPOINTS = {
  xs: 360,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
} as const

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINTS.md - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.md)
    }
    mql.addEventListener('change', onChange)
    setIsMobile(window.innerWidth < BREAKPOINTS.md)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile ?? false
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(
      `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
    )
    const onChange = () => {
      const width = window.innerWidth
      setIsTablet(width >= BREAKPOINTS.md && width < BREAKPOINTS.lg)
    }
    mql.addEventListener('change', onChange)
    onChange()
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isTablet ?? false
}

export function useMediaQuery() {
  const [windowWidth, setWindowWidth] = React.useState<number | undefined>(undefined)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!mounted) {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: false,
      isXs: false,
      isSm: false,
      isMd: false,
      isLg: false,
      isXl: false,
      is2xl: false,
      is3xl: false,
      width: undefined,
    }
  }

  return {
    isMobile: windowWidth !== undefined && windowWidth < BREAKPOINTS.md,
    isTablet:
      windowWidth !== undefined && windowWidth >= BREAKPOINTS.md && windowWidth < BREAKPOINTS.lg,
    isDesktop: windowWidth !== undefined && windowWidth >= BREAKPOINTS.lg,
    isXs: windowWidth !== undefined && windowWidth < BREAKPOINTS.xs,
    isSm:
      windowWidth !== undefined && windowWidth >= BREAKPOINTS.sm && windowWidth < BREAKPOINTS.md,
    isMd:
      windowWidth !== undefined && windowWidth >= BREAKPOINTS.md && windowWidth < BREAKPOINTS.lg,
    isLg:
      windowWidth !== undefined && windowWidth >= BREAKPOINTS.lg && windowWidth < BREAKPOINTS.xl,
    isXl:
      windowWidth !== undefined &&
      windowWidth >= BREAKPOINTS.xl &&
      windowWidth < BREAKPOINTS['2xl'],
    is2xl:
      windowWidth !== undefined &&
      windowWidth >= BREAKPOINTS['2xl'] &&
      windowWidth < BREAKPOINTS['3xl'],
    is3xl: windowWidth !== undefined && windowWidth >= BREAKPOINTS['3xl'],
    width: windowWidth,
  }
}
