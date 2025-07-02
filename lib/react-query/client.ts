// lib/react-query/client.ts

import { QueryClient } from '@tanstack/react-query'

type StatusError = { status: number }

function hasStatus(error: unknown): error is StatusError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  )
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error: unknown) => {
          if (typeof error === 'object' && error !== null && 'status' in error) {
            const status = (error as { status?: number }).status
            if (status && status >= 400 && status < 500 && status !== 408) {
              return false
            }
          }
          return failureCount < 3
        },
      },
      mutations: {
        retry: 1,
      },
    },
  })
}
