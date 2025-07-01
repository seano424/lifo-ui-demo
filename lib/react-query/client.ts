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
          if (
            hasStatus(error) &&
            error.status >= 400 &&
            error.status < 500 &&
            error.status !== 408
          ) {
            return false
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
