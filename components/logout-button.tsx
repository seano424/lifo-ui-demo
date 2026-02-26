'use client'

import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LogOutIcon } from 'lucide-react'

interface LogoutButtonProps {
  className?: string
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const t = useTranslations('marketing.auth')

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <button
      type="button"
      onClick={logout}
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 text-sm outline-hidden transition-colors focus:bg-background focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 dark:text-foreground w-full px-0.5 py-1.5',
        className,
      )}
      aria-label={t('logout')}
    >
      <LogOutIcon className="size-4 shrink-0" />
      {t('logout')}
    </button>
  )
}
