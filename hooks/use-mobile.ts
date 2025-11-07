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
  const [state, setState] = React.useState({
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
    width: undefined as number | undefined,
  })

  React.useEffect(() => {
    // Create media query lists for each breakpoint
    const mobileQuery = window.matchMedia(`(max-width: ${BREAKPOINTS.md - 1}px)`)
    const tabletQuery = window.matchMedia(
      `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
    )
    const desktopQuery = window.matchMedia(`(min-width: ${BREAKPOINTS.lg}px)`)

    const updateState = () => {
      const width = window.innerWidth
      setState({
        isMobile: width < BREAKPOINTS.md,
        isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
        isDesktop: width >= BREAKPOINTS.lg,
        isXs: width < BREAKPOINTS.xs,
        isSm: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
        isMd: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
        isLg: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
        isXl: width >= BREAKPOINTS.xl && width < BREAKPOINTS['2xl'],
        is2xl: width >= BREAKPOINTS['2xl'] && width < BREAKPOINTS['3xl'],
        is3xl: width >= BREAKPOINTS['3xl'],
        width,
      })
    }

    // Set initial state
    updateState()

    // Listen for media query changes (more efficient than resize events)
    const onChange = () => updateState()
    mobileQuery.addEventListener('change', onChange)
    tabletQuery.addEventListener('change', onChange)
    desktopQuery.addEventListener('change', onChange)

    return () => {
      mobileQuery.removeEventListener('change', onChange)
      tabletQuery.removeEventListener('change', onChange)
      desktopQuery.removeEventListener('change', onChange)
    }
  }, [])

  return state
}
