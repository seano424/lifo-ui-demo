'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/query-keys'
import { useStoreState } from '@/lib/stores/store-context'
import { logger } from '@/lib/utils/logger'

/**
 * Singleton class to manage logout state across the application.
 * This ensures proper encapsulation and prevents direct manipulation.
 */
class LogoutStateManager {
  private isUserInitiatedLogout = false

  /**
   * Sets whether the current logout was initiated by the user.
   * @param value - true if user clicked logout, false otherwise
   */
  setUserInitiated(value: boolean): void {
    this.isUserInitiatedLogout = value
  }

  /**
   * Checks if the current logout was initiated by the user.
   * @returns true if user initiated the logout
   */
  isUserInitiated(): boolean {
    return this.isUserInitiatedLogout
  }

  /**
   * Resets the logout state. Called after logout is processed.
   */
  reset(): void {
    this.isUserInitiatedLogout = false
  }
}

// Singleton instance
const logoutStateManager = new LogoutStateManager()

/**
 * Sets whether the current logout was initiated by the user.
 * @param value - true if user clicked logout, false otherwise
 */
export function setUserInitiatedLogout(value: boolean): void {
  logoutStateManager.setUserInitiated(value)
}

/**
 * Checks if the current logout was initiated by the user.
 * @returns true if user initiated the logout
 */
export function isLogoutUserInitiated(): boolean {
  return logoutStateManager.isUserInitiated()
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
  const invalidateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { setActiveStore, setUserStores } = useStoreState()

  useEffect(() => {
    let isMounted = true // ✅ Track mount state to prevent updates on unmounted component

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.log('AuthStateMonitor', `Auth event: ${event}`, {
        hasSession: !!session,
        userInitiated: logoutStateManager.isUserInitiated(),
        hasShownToast: hasShownLogoutToast.current,
      })

      if (event === 'SIGNED_IN') {
        // Reset flags on successful sign in
        logoutStateManager.reset()
        hasShownLogoutToast.current = false

        // ✅ SOLUTION: Debounce invalidations to avoid cascading refetches
        if (invalidateTimeoutRef.current) {
          clearTimeout(invalidateTimeoutRef.current)
        }

        invalidateTimeoutRef.current = setTimeout(() => {
          if (!isMounted) return // ✅ Guard against unmounted component

          // Invalidate user queries
          queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser() })

          // ✅ More targeted invalidation - only user's stores, not ALL stores
          if (session?.user?.id) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.stores.userStores(session.user.id),
            })
          }

          queryClient.invalidateQueries({ queryKey: queryKeys.userPreferences.all })

          logger.log('AuthStateMonitor', 'User signed in, refreshing user data and stores')
        }, 300) // Wait 300ms for multiple events to settle
      }

      if (event === 'SIGNED_OUT') {
        logger.log('AuthStateMonitor', 'SIGNED_OUT event - redirecting then clearing cache')

        // Redirect FIRST to avoid "Not authenticated" errors on dashboard pages
        const currentPath = window.location.pathname
        const shouldRedirect =
          !currentPath.startsWith('/auth') &&
          !currentPath.startsWith('/onboarding') &&
          currentPath !== '/'

        if (shouldRedirect) {
          const redirectPath = logoutStateManager.isUserInitiated() ? '/' : '/auth/login'
          router.push(redirectPath)
        }

        // Short delay to allow redirect to start before clearing data
        setTimeout(() => {
          // Clear user data to force UI update
          queryClient.setQueryData(queryKeys.auth.currentUser(), null)

          // Clear Zustand store state (localStorage handled in setActiveStore)
          setActiveStore(null)
          setUserStores([])

          // Then clear all cached query data when user signs out
          queryClient.clear()

          if (!logoutStateManager.isUserInitiated() && !hasShownLogoutToast.current) {
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
          } else if (logoutStateManager.isUserInitiated()) {
            logger.log('AuthStateMonitor', 'User-initiated logout, no feedback needed')
          }

          // Reset the flag after handling
          logoutStateManager.reset()
        }, 100) // 100ms delay to allow redirect to start
      }

      if (event === 'TOKEN_REFRESHED') {
        logger.log('AuthStateMonitor', 'Token refreshed successfully')
      }
    })

    // Cleanup subscription on unmount
    return () => {
      isMounted = false // ✅ Mark as unmounted to prevent state updates
      // ✅ Clear timeout on unmount
      if (invalidateTimeoutRef.current) {
        clearTimeout(invalidateTimeoutRef.current)
      }
      logger.log('AuthStateMonitor', 'Cleaning up auth state subscription')
      subscription.unsubscribe()
    }
  }, [router, queryClient, supabase.auth, setActiveStore, setUserStores])

  return {
    setUserInitiatedLogout,
    isLogoutUserInitiated,
  }
}
