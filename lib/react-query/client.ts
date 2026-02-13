// lib/react-query/client.ts

import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

type StatusError = { status: number; message?: string }

function hasStatus(error: unknown): error is StatusError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  )
}

function isAuthError(error: unknown): boolean {
  if (!hasStatus(error)) return false

  const status = error.status
  const message = error.message?.toLowerCase() || ''

  // Check for auth-related error statuses and messages
  return (
    status === 401 ||
    message.includes('refresh') ||
    message.includes('token') ||
    message.includes('unauthorized') ||
    message.includes('authentication')
  )
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute (reduced refetches for better UX)
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error: unknown) => {
          // Don't retry auth errors - they need user intervention
          if (isAuthError(error)) {
            logger.log('QueryClient', 'Auth error detected, not retrying:', error)
            return false
          }

          if (hasStatus(error)) {
            const status = error.status
            // Don't retry 4xx errors (except 408 timeout)
            if (status >= 400 && status < 500 && status !== 408) {
              return false
            }
          }
          return failureCount < 3
        },
        // Global error handler for queries
        throwOnError: error => {
          if (isAuthError(error)) {
            logger.log('QueryClient', 'Authentication error in query:', error)

            // Show a toast for auth errors
            if (hasStatus(error) && error.status === 401) {
              toast.error('Authentication error. Please log in again.', {
                duration: 4000,
                description: 'Your session may have expired or been revoked.',
              })
            }
          }

          // Always throw to maintain normal error flow
          return true
        },
      },
      mutations: {
        retry: (failureCount, error: unknown) => {
          // Don't retry auth errors for mutations either
          if (isAuthError(error)) {
            logger.log('QueryClient', 'Auth error in mutation, not retrying:', error)
            return false
          }
          return failureCount < 1
        },
        // Global error handler for mutations
        throwOnError: error => {
          if (isAuthError(error)) {
            logger.log('QueryClient', 'Authentication error in mutation:', error)

            if (hasStatus(error) && error.status === 401) {
              toast.error('Authentication required. Please log in again.', {
                duration: 4000,
                description: 'Your session has expired.',
              })
            }
          }

          return true
        },
      },
    },
  })
}
