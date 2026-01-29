'use client'

import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/use-users'
import { useTranslations } from 'next-intl'
import { ChevronRightIcon } from 'lucide-react'

export function HeroButtons() {
  const t = useTranslations('landingpage.hero.buttons')
  const { data: currentUser } = useCurrentUser()

  return (
    <>
      {currentUser && (
        <Button
          size="lg"
          variant={'default'}
          asLink
          href="/dashboard"
          className="flex items-center gap-1 capitalize group font-bold"
        >
          {t('dashboard')}
          <ChevronRightIcon className="-rotate-45 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform duration-300 ease-in-out h-5 w-5 stroke-2" />
        </Button>
      )}
      {!currentUser && (
        <Button
          asLink
          href="/onboarding/create-account"
          size="lg"
          className="flex items-center gap-1 capitalize group font-bold"
        >
          {t('freeTrial')}
          <ChevronRightIcon className="-rotate-45 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform duration-300 ease-in-out h-5 w-5 stroke-2" />
        </Button>
      )}
    </>
  )
}
