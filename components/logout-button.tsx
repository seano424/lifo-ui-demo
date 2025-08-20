'use client'

import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

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
