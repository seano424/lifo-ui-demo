'use client'

import { useEffect, useState } from 'react'
import { QueryErrorBoundary } from './query-error-boundary'

/**
 * QueryBoundary - Ensures QueryClient is available before rendering children
 *
 * This prevents "No QueryClient set" errors in Firefox and other browsers
 * when components try to use React Query hooks before the provider is ready.
 *
 * Uses a simple delay + error boundary instead of checking the QueryClient
 * (which would itself trigger the error we're trying to prevent!)
 */
export function QueryBoundary({
  children,
  fallback = null,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const [isReady, setIsReady] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // Mark as mounted (client-side only)
    setIsMounted(true)

    // Wait a tick to ensure QueryClient provider is mounted
    // This gives the provider time to initialize before children render
    // Extra delay for HMR situations
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  // During SSR or before mount, always show fallback
  if (!isMounted || !isReady) {
    return <>{fallback}</>
  }

  return <QueryErrorBoundary>{children}</QueryErrorBoundary>
}
