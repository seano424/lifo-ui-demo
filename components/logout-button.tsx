'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useStoreState } from '@/lib/stores/store-context'

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
  const { setActiveStore, setUserStores } = useStoreState()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const logout = async () => {
    if (isLoggingOut) return // Prevent double-clicks

    setIsLoggingOut(true)

    const supabase = createClient()

    try {
      await supabase.auth.signOut()
    } catch (error) {
      // Log but continue - always clear local state even if API fails
      console.error('Logout API error:', error)
    }

    // Clear all local state to prevent data leakage between users
    setActiveStore(null)
    setUserStores([])
    queryClient.clear()

    // Navigate and refresh server components
    router.push('/')
    router.refresh()
  }

  return (
    <Button
      variant={variant}
      size="default"
      onClick={logout}
      disabled={isLoggingOut}
      className={className}
    >
      {t('logout')}
    </Button>
  )
}
