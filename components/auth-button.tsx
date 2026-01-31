'use client'

import { useTranslations } from 'next-intl'
import { useCurrentUser } from '@/hooks/use-users'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from './ui/button'

type AuthButtonProps = {
  isMobile?: boolean
}

export function AuthButton({ isMobile }: AuthButtonProps) {
  const t = useTranslations('marketing.auth')
  const { data: user, isLoading } = useCurrentUser()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <div className="w-28 h-10 bg-gray-200 animate-pulse rounded-2xl" />
        <div className="w-24 h-10 bg-gray-200 animate-pulse rounded-2xl" />
      </div>
    )
  }

  return user ? (
    <div
      className={cn('flex items-center font-mono gap-2', isMobile && 'flex-col gap-4 items-start')}
    >
      <Button
        asChild
        size="default"
        variant={'secondary'}
        asLink
        href="/dashboard"
        className={cn(isMobile && 'w-full')}
      >
        {t('goToDashboard')}
      </Button>

      <Button
        // asChild
        size="default"
        variant={'gray'}
        onClick={logout}
        className={cn(isMobile && 'w-full')}
      >
        {t('logout')}
      </Button>
    </div>
  ) : (
    <>
      {/* Desktop */}
      <div className={cn('flex gap-2 items-center font-mono', isMobile && 'hidden')}>
        <Button asChild variant={'secondary'} asLink href="/auth/sign-up">
          {t('signup')}
        </Button>
        <Button asChild variant="gray" asLink href="/auth/login">
          {t('login')}
        </Button>
      </div>
      {/* Mobile */}
      <div
        className={cn(
          'flex flex-col gap-2',
          isMobile && 'flex-col-reverse gap-2 items-start',
          !isMobile && 'hidden',
        )}
      >
        <Button asChild variant={'gray'} asLink href="/auth/login" className="uppercase w-full">
          {t('login')}
        </Button>

        <Button
          asChild
          variant={'secondary'}
          asLink
          href="/auth/sign-up"
          className="uppercase w-full"
        >
          {t('signup')}
        </Button>
      </div>
    </>
  )
}
