'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/use-users'
import { useTranslations } from 'next-intl'
import { ChevronRightIcon } from 'lucide-react'

export const HeroButtons = memo(function HeroButtons() {
  const t = useTranslations('landingpage.hero.buttons')
  const { data: currentUser, isLoading } = useCurrentUser()

  // Reserve space to prevent layout shift - show nothing while loading from cache
  if (isLoading) {
    return <div className="h-11 w-full max-w-sm" />
  }

  return (
    <>
      {currentUser && (
        <Button size="lg" variant="secondary" asLink href="/dashboard" className="group">
          {t('dashboard')}
          <ChevronRightIcon className="w-5 h-5 -rotate-45 transition-transform duration-300 ease-in-out group-hover:translate-x-px group-hover:-translate-y-px" />
        </Button>
      )}
      {!currentUser && (
        <div className="flex gap-2 flex-wrap">
          <Button
            asLink
            href="/auth/sign-up"
            size="lg"
            className="flex items-center gap-1 group"
            variant="black"
            hasArrowUpIcon
          >
            {t('freeTrial')}
          </Button>
          <Button
            variant="outline"
            asLink
            target="_blank"
            rel="noopener noreferrer"
            href="https://calendar.app.google/on8fX3nrWppW7qow7"
            size="lg"
            className="group flex items-center gap-1"
            hasArrowUpIcon
          >
            {t('bookDemo')}
          </Button>
        </div>
      )}
    </>
  )
})
