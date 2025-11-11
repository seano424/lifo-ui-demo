'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

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
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const logout = async () => {
    if (isLoggingOut) return // Prevent double-clicks

    setIsLoggingOut(true)

    const supabase = createClient()

    try {
      await supabase.auth.signOut()
    } catch (error) {
      // Log but continue - local cleanup happens via navigation
      console.error('Logout API error:', error)
    }

    // Navigate and refresh - hooks will naturally clear state
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
