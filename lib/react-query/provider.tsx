// lib/react-query/provider.tsx

'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { createQueryClient } from './client'
import { useAuthStateMonitor, useRefreshTokenErrorHandler } from '@/hooks/use-auth-state-monitor'

function AuthStateProvider({ children }: { children: React.ReactNode }) {
  // Initialize auth state monitoring
  useAuthStateMonitor()
  useRefreshTokenErrorHandler()

  return <>{children}</>
}

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <AuthStateProvider>{children}</AuthStateProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
