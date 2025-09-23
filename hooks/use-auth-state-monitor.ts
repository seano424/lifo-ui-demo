'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

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
      console.log(`[AuthStateMonitor] Auth event: ${event}`, {
        hasSession: !!session,
        userInitiated: isUserInitiatedLogout,
        hasShownToast: hasShownLogoutToast.current,
      })

      if (event === 'SIGNED_IN') {
        // Reset flags on successful sign in
        isUserInitiatedLogout = false
        hasShownLogoutToast.current = false

        // Invalidate user queries to refresh user data
        queryClient.invalidateQueries({ queryKey: ['currentAuthUser'] })

        console.log('[AuthStateMonitor] User signed in, refreshing user data')
      }

      if (event === 'SIGNED_OUT') {
        // Clear all cached query data when user signs out
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

          console.log(
            '[AuthStateMonitor] Automatic session termination detected, showing user feedback',
          )
        } else if (isUserInitiatedLogout) {
          console.log('[AuthStateMonitor] User-initiated logout, no feedback needed')
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
        console.log('[AuthStateMonitor] Token refreshed successfully')
      }
    })

    // Cleanup subscription on unmount
    return () => {
      console.log('[AuthStateMonitor] Cleaning up auth state subscription')
      subscription.unsubscribe()
    }
  }, [router, queryClient, supabase.auth])

  return {
    setUserInitiatedLogout,
    isLogoutUserInitiated,
  }
}

/**
 * Hook to detect refresh token errors and provide appropriate feedback
 */
export function useRefreshTokenErrorHandler() {
  useEffect(() => {
    // Listen for global fetch errors that might indicate refresh token issues
    const originalFetch = window.fetch

    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      // Check for auth-related errors
      if (response.status === 401 && !isUserInitiatedLogout) {
        const url = args[0]?.toString() || 'unknown'

        // Only show feedback for non-auth endpoints to avoid noise
        if (!url.includes('/auth/') && !url.includes('/login')) {
          console.log(`[RefreshTokenErrorHandler] 401 detected on ${url}`)

          // Check if we still have a session
          const supabase = createClient()
          const {
            data: { session },
          } = await supabase.auth.getSession()

          if (!session) {
            toast.error('Your session has expired. Please log in again.', {
              duration: 5000,
              description: 'Your authentication token is no longer valid.',
              style: {
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                border: '1px solid hsl(var(--primary))',
              },
            })
          }
        }
      }

      return response
    }

    // Cleanup
    return () => {
      window.fetch = originalFetch
    }
  }, [])
}
