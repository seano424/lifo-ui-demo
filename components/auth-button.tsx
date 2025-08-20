'use client'

import { useCurrentUser } from '@/hooks/use-users'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { LogoutButton } from './logout-button'
import { Button } from './ui/button'

type AuthButtonProps = {
  isMobile?: boolean
}

export function AuthButton({ isMobile }: AuthButtonProps) {
  const t = useTranslations('marketing.auth')
  const { data: user, isLoading } = useCurrentUser()

  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <div className="w-20 h-8 bg-gray-200 animate-pulse rounded" />
        <div className="w-24 h-8 bg-gray-200 animate-pulse rounded" />
      </div>
    )
  }

  return user ? (
    <div
      className={cn('flex items-center gap-2', isMobile && 'flex-col-reverse gap-2 items-start')}
    >
      <Button asChild size="default" variant={'secondary'} className={cn(isMobile && 'w-full')}>
        <Link href="/dashboard">{t('goToDashboard')}</Link>
      </Button>
      <LogoutButton variant="gray" className={cn(isMobile && 'w-full')} />
    </div>
  ) : (
    <>
      {/* Desktop */}
      <div className={cn('flex gap-2 items-center', isMobile && 'hidden')}>
        <Button asChild variant={'secondary'}>
          <Link href="/onboarding/create-account">{t('signup')}</Link>
        </Button>
        <Button asChild variant={'gray'}>
          <Link href="/auth/login">{t('login')}</Link>
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
        <Button asChild variant={'gray'} className="uppercase w-full">
          <Link href="/auth/login">{t('login')}</Link>
        </Button>
        <Button asChild variant={'secondary'} className="uppercase w-full">
          <Link href="/onboarding/create-account">{t('signup')}</Link>
        </Button>
      </div>
    </>
  )
}
