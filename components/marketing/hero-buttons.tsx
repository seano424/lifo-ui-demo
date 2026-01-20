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
        <Button size="lg" asLink href="/dashboard">
          {t('dashboard')}
        </Button>
      )}
      {!currentUser && (
        <Button
          asLink
          href="/onboarding/create-account"
          size="lg"
          className="font-semibold font-heading flex items-center gap-1"
          variant="black"
        >
          {t('freeTrial')}
          <ChevronRightIcon className="w-4 h-4" />
        </Button>
      )}
    </>
  )
}
