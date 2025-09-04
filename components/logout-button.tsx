'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
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
  const queryClient = useQueryClient()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    
    // Clear all cached query data to prevent data leakage between users
    queryClient.clear()
    
    router.push('/auth/login')
  }

  return (
    <Button variant={variant} size="default" onClick={logout} className={className}>
      {t('logout')}
    </Button>
  )
}
