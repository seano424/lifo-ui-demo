'use client'

import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface LogoutButtonProps {
  className?: string
  variant?: 'default' | 'secondary' | 'ghost' | 'brandSecondary' | 'destructive'
}

export function LogoutButton({ className, variant = 'default' }: LogoutButtonProps) {
  const t = useTranslations('marketing.auth')
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <Button variant={variant} size="default" onClick={logout} className={className}>
      {t('logout')}
    </Button>
  )
}
