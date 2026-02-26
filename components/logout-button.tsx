'use client'

import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { LogOutIcon } from 'lucide-react'

export function LogoutButton() {
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
      className="relative flex cursor-pointer select-none items-center gap-2 text-sm outline-hidden transition-colors focus:bg-background focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 dark:text-foreground w-full px-0.5 py-1.5"
      aria-label={t('logout')}
    >
      <LogOutIcon className="size-4 shrink-0" />
      {t('logout')}
    </button>
  )
}
