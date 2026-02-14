// lib/react-query/provider.tsx

'use client'

import { isServer, type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { createQueryClient } from './client'

// Dynamically import ReactQueryDevtools to avoid SSR issues and Firefox-specific bugs
// This prevents the devtools from loading a separate React Query instance
const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then(d => ({ default: d.ReactQueryDevtools })),
  { ssr: false },
)

// Module-level singleton pattern (official recommendation for Next.js App Router)
// This survives React's Suspense lifecycle, preventing "No QueryClient set" errors
let browserQueryClient: QueryClient | undefined

function makeQueryClient() {
  return createQueryClient()
}

export function getQueryClient() {
  if (isServer) {
    // Server: always create a new QueryClient for each request
    return makeQueryClient()
  } else {
    // Browser: create QueryClient once and reuse it
    // Module-level singleton survives Suspense re-renders
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient()
    }
    return browserQueryClient
  }
}

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  // Use singleton pattern instead of useState to survive Suspense boundaries
  // This is the official recommendation for Next.js App Router
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
