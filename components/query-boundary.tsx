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

  useEffect(() => {
    // Wait a tick to ensure QueryClient provider is mounted
    // This gives the provider time to initialize before children render
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 10)
    return () => clearTimeout(timer)
  }, [])

  if (!isReady) {
    return <>{fallback}</>
  }

  return <QueryErrorBoundary>{children}</QueryErrorBoundary>
}
