'use client'

import { memo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useCurrentUser } from '@/hooks/use-users'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from './ui/button'

type AuthButtonProps = {
  isMobile?: boolean
}

export const AuthButton = memo(function AuthButton({ isMobile }: AuthButtonProps) {
  const t = useTranslations('marketing.auth')
  const { data: user, isLoading } = useCurrentUser()

  const logout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }, [])

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return (
      <div
        className={cn(
          'flex items-center font-mono gap-2',
          isMobile && 'flex-col gap-4 items-start',
        )}
      >
        <Button
          asLink
          href="/demo"
          size="sm"
          variant="secondary"
          className={cn(isMobile && 'w-full')}
        >
          {t('goToDashboard')}
        </Button>
      </div>
    )
  }

  // Reserve space to prevent layout shift - matches actual button sizes
  if (isLoading) {
    return (
      <div
        className={cn('flex items-center gap-2', isMobile && 'flex-col gap-4 items-start w-full')}
      >
        <div
          className={cn(
            'h-10 bg-muted/50 animate-pulse rounded-2xl',
            isMobile ? 'w-full' : 'w-[140px]',
          )}
        />
        <div
          className={cn(
            'h-10 bg-muted/50 animate-pulse rounded-2xl',
            isMobile ? 'w-full' : 'w-[80px]',
          )}
        />
      </div>
    )
  }

  return user ? (
    <div
      className={cn('flex items-center font-mono gap-2', isMobile && 'flex-col gap-4 items-start')}
    >
      <Button
        asChild
        size="sm"
        variant={'secondary'}
        asLink
        href="/dashboard"
        className={cn(isMobile && 'w-full')}
      >
        {t('goToDashboard')}
      </Button>

      <Button size="sm" variant={'gray'} onClick={logout} className={cn(isMobile && 'w-full')}>
        {t('logout')}
      </Button>
    </div>
  ) : (
    <>
      {/* Desktop */}
      <div className={cn('flex gap-2 items-center font-mono', isMobile && 'hidden')}>
        <Button asChild size="sm" variant={'secondary'} asLink href="/auth/sign-up">
          {t('signup')}
        </Button>
        <Button asChild size="sm" variant="gray" asLink href="/auth/login">
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
        <Button
          asChild
          size="sm"
          variant={'gray'}
          asLink
          href="/auth/login"
          className="uppercase w-full"
        >
          {t('login')}
        </Button>

        <Button
          asChild
          size="sm"
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
})
