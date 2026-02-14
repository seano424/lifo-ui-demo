// lib/react-query/provider.tsx

'use client'

import { isServer, type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createQueryClient } from './client'

// Singleton pattern to prevent "No QueryClient set" errors during hydration
// This ensures the QueryClient is always available, even during SSR/hydration in Next.js 15
let browserQueryClient: QueryClient | undefined

function makeQueryClient() {
  return createQueryClient()
}

function getQueryClient() {
  if (isServer) {
    // Server: always create a new QueryClient for each request
    return makeQueryClient()
  } else {
    // Browser: create QueryClient once and reuse it
    // This prevents "No QueryClient set" errors during hydration
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient()
    }
    return browserQueryClient
  }
}

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  // NOTE: Don't use useState here - it causes hydration mismatches
  // Instead, call getQueryClient() directly which handles the singleton pattern
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
