import * as React from 'react'

// Breakpoints matching globals.css
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

  return !!isMobile
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

  return !!isTablet
}

export function useMediaQuery() {
  // Use a flag to track if we're mounted (client-side)
  const [isMounted, setIsMounted] = React.useState(false)
  const [windowWidth, setWindowWidth] = React.useState<number | undefined>(undefined)

  React.useEffect(() => {
    // Mark as mounted to avoid SSR hydration mismatch
    setIsMounted(true)

    let timeoutId: NodeJS.Timeout | null = null

    const handleResize = () => {
      // Debounce resize events to prevent rapid re-renders
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        setWindowWidth(window.innerWidth)
      }, 150) // 150ms debounce
    }

    // Set initial width immediately
    setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Memoize the return value to prevent unnecessary re-renders
  // Return false for all breakpoints during SSR to avoid hydration mismatch
  return React.useMemo(
    () => ({
      isMobile: isMounted && windowWidth !== undefined && windowWidth < BREAKPOINTS.md,
      isTablet:
        isMounted &&
        windowWidth !== undefined &&
        windowWidth >= BREAKPOINTS.md &&
        windowWidth < BREAKPOINTS.lg,
      isDesktop: isMounted && windowWidth !== undefined && windowWidth >= BREAKPOINTS.lg,
      isXs: isMounted && windowWidth !== undefined && windowWidth < BREAKPOINTS.xs,
      isSm:
        isMounted &&
        windowWidth !== undefined &&
        windowWidth >= BREAKPOINTS.sm &&
        windowWidth < BREAKPOINTS.md,
      isMd:
        isMounted &&
        windowWidth !== undefined &&
        windowWidth >= BREAKPOINTS.md &&
        windowWidth < BREAKPOINTS.lg,
      isLg:
        isMounted &&
        windowWidth !== undefined &&
        windowWidth >= BREAKPOINTS.lg &&
        windowWidth < BREAKPOINTS.xl,
      isXl:
        isMounted &&
        windowWidth !== undefined &&
        windowWidth >= BREAKPOINTS.xl &&
        windowWidth < BREAKPOINTS['2xl'],
      is2xl:
        isMounted &&
        windowWidth !== undefined &&
        windowWidth >= BREAKPOINTS['2xl'] &&
        windowWidth < BREAKPOINTS['3xl'],
      is3xl: isMounted && windowWidth !== undefined && windowWidth >= BREAKPOINTS['3xl'],
      width: windowWidth,
    }),
    [isMounted, windowWidth],
  )
}
