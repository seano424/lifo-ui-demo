'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { setUserInitiatedLogout } from '@/hooks/use-auth-state-monitor'

interface LogoutButtonProps {
  className?: string
  variant?:
    | 'link'
    | 'default'
    | 'secondary'
    | 'ghost'
    | 'destructive'
    | 'outline'
    | 'subtle'
    | 'subtleSecondary'
    | 'brand'
    | 'brandOutline'
    | 'brandSecondaryOutline'
    | 'gray'
    | null
    | undefined
}

export function LogoutButton({ className, variant = 'gray' }: LogoutButtonProps) {
  const t = useTranslations('marketing.auth')
  const router = useRouter()

  const logout = async () => {
    try {
      console.log('[LogoutButton] Starting logout process')

      // Mark this as a user-initiated logout to prevent showing security warning
      setUserInitiatedLogout(true)

      const supabase = createClient()
      console.log('[LogoutButton] Calling supabase.auth.signOut()')
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('[LogoutButton] Logout error:', error)

        // Handle rate limiting gracefully
        if (error.message?.includes('too many') || error.message?.includes('rate limit')) {
          console.log('[LogoutButton] Rate limited - clearing local state anyway')
          // Continue with logout flow even if Supabase request failed
        } else {
          throw error
        }
      }

      console.log(
        '[LogoutButton] Logout successful - auth state monitor will handle cache clearing',
      )

      // Don't manipulate cache here - let useAuthStateMonitor handle it
      // This prevents race conditions and ensures consistent state management

      console.log('[LogoutButton] Redirecting to home page')
      router.push('/')
    } catch (error) {
      console.error('[LogoutButton] Logout failed:', error)
      // Reset the flag on error
      setUserInitiatedLogout(false)
      // Still redirect on error
      router.push('/')
    }
  }

  return (
    <Button variant={variant} size="default" onClick={logout} className={className}>
      {t('logout')}
    </Button>
  )
}
