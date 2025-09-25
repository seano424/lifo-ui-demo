'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/query-keys'
import { logger } from '@/lib/utils/logger'

// Global state to track user-initiated logouts
let isUserInitiatedLogout = false

export function setUserInitiatedLogout(value: boolean) {
  isUserInitiatedLogout = value
}

export function isLogoutUserInitiated(): boolean {
  return isUserInitiatedLogout
}

/**
 * Hook to monitor Supabase auth state changes and provide user feedback
 * for unexpected session terminations
 */
export function useAuthStateMonitor() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const hasShownLogoutToast = useRef(false)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.log('AuthStateMonitor', `Auth event: ${event}`, {
        hasSession: !!session,
        userInitiated: isUserInitiatedLogout,
        hasShownToast: hasShownLogoutToast.current,
      })

      if (event === 'SIGNED_IN') {
        // Reset flags on successful sign in
        isUserInitiatedLogout = false
        hasShownLogoutToast.current = false

        // Invalidate user queries to refresh user data
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser() })

        logger.log('AuthStateMonitor', 'User signed in, refreshing user data')
      }

      if (event === 'SIGNED_OUT') {
        logger.log('AuthStateMonitor', 'SIGNED_OUT event - clearing cache and forcing UI update')

        // First, immediately set current user to null to force UI update
        queryClient.setQueryData(queryKeys.auth.currentUser(), null)

        // Then clear all cached query data when user signs out
        queryClient.clear()

        if (!isUserInitiatedLogout && !hasShownLogoutToast.current) {
          // This was an automatic/security-related logout
          hasShownLogoutToast.current = true

          toast.error('Your session was terminated for security reasons. Please log in again.', {
            duration: 6000, // Show for 6 seconds
            description: 'This can happen when logging in from multiple devices or locations.',
            className: 'session-termination-toast',
            style: {
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              border: '1px solid hsl(var(--primary))',
              borderRadius: '12px',
              fontWeight: '500',
            },
          })

          logger.log(
            'AuthStateMonitor',
            'Automatic session termination detected, showing user feedback',
          )
        } else if (isUserInitiatedLogout) {
          logger.log('AuthStateMonitor', 'User-initiated logout, no feedback needed')
        }

        // Reset the flag after handling
        isUserInitiatedLogout = false

        // Redirect to login page if not already there
        const currentPath = window.location.pathname
        if (
          !currentPath.startsWith('/auth') &&
          !currentPath.startsWith('/onboarding') &&
          currentPath !== '/'
        ) {
          router.push('/auth/login')
        }
      }

      if (event === 'TOKEN_REFRESHED') {
        logger.log('AuthStateMonitor', 'Token refreshed successfully')
      }
    })

    // Cleanup subscription on unmount
    return () => {
      logger.log('AuthStateMonitor', 'Cleaning up auth state subscription')
      subscription.unsubscribe()
    }
  }, [router, queryClient, supabase.auth])

  return {
    setUserInitiatedLogout,
    isLogoutUserInitiated,
  }
}
