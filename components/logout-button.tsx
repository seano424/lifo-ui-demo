'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { setUserInitiatedLogout } from '@/hooks/use-auth-state-monitor'
import { logger } from '@/lib/utils/logger'

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
    // Mark this as a user-initiated logout to prevent showing security warning
    setUserInitiatedLogout(true)

    try {
      logger.log('LogoutButton', 'Starting logout process')

      const supabase = createClient()
      logger.log('LogoutButton', 'Calling supabase.auth.signOut()')
      const { error } = await supabase.auth.signOut()

      if (error) {
        logger.error('LogoutButton', 'Logout error:', error)

        // Handle rate limiting gracefully
        if (error.message?.includes('too many') || error.message?.includes('rate limit')) {
          logger.log('LogoutButton', 'Rate limited - clearing local state anyway')
          // Continue with logout flow even if Supabase request failed
        } else {
          throw error
        }
      }

      logger.log(
        'LogoutButton',
        'Logout successful - auth state monitor will handle cache clearing',
      )

      // Don't manipulate cache here - let useAuthStateMonitor handle it
      // This prevents race conditions and ensures consistent state management
    } catch (error) {
      logger.error('LogoutButton', 'Logout failed:', error)
    } finally {
      logger.log('LogoutButton', 'Redirecting to home page')
      router.push('/')
    }
  }

  return (
    <Button variant={variant} size="default" onClick={logout} className={className}>
      {t('logout')}
    </Button>
  )
}
