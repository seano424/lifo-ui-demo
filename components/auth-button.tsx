'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from './ui/button'
import { LogoutButton } from './logout-button'
import { useCurrentUser } from '@/hooks/use-users'

export function AuthButton() {
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
    <div className="flex items-center gap-4">
      <LogoutButton />
      <Button asChild size="default" variant={'brand'}>
        <Link href="/dashboard">{t('goToDashboard')}</Link>
      </Button>
    </div>
  ) : (
    <div className="flex gap-10 items-center uppercase">
      <Link
        className="text-xs dark:hover:text-brand-secondary hover:text-brand-primary"
        href="/auth/login"
      >
        {t('login')}
      </Link>

      <Button asChild size="sm" variant={'brandSecondary'} className="uppercase">
        <Link href="/onboarding/create-account">{t('signup')}</Link>
      </Button>
    </div>
  )
}
