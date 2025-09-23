'use client'

import { useQueryClient } from '@tanstack/react-query'
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
  const queryClient = useQueryClient()

  const logout = async () => {
    // Mark this as a user-initiated logout to prevent showing security warning
    setUserInitiatedLogout(true)

    const supabase = createClient()
    await supabase.auth.signOut()

    // Clear all cached query data to prevent data leakage between users
    queryClient.clear()

    router.push('/')
  }

  return (
    <Button variant={variant} size="default" onClick={logout} className={className}>
      {t('logout')}
    </Button>
  )
}
