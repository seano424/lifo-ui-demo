'use client'

import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/use-users'
import { useTranslations } from 'next-intl'
import { ChevronRightIcon } from 'lucide-react'
// import Image from 'next/image'

export function HeroButtons() {
  const t = useTranslations('landingpage.hero.buttons')
  const { data: currentUser } = useCurrentUser()

  return (
    <>
      {currentUser && (
        <Button size="lg" asLink href="/dashboard" className="capitalize group">
          {t('dashboard')}
          <ChevronRightIcon className="w-5 h-5 -rotate-45 transition-transform duration-300 ease-in-out group-hover:translate-x-px group-hover:-translate-y-px" />
        </Button>
      )}
      {!currentUser && (
        <div className="flex gap-2 flex-wrap">
          <Button
            asLink
            href="/onboarding/create-account"
            size="lg"
            className="font-semibold font-heading flex items-center gap-1 capitalize group"
            variant="black"
          >
            {t('freeTrial')}
            <ChevronRightIcon className="w-5 h-5 -rotate-45 transition-transform duration-300 ease-in-out group-hover:translate-x-px group-hover:-translate-y-px" />
          </Button>
          <Button
            variant="outline"
            asLink
            target="_blank"
            rel="noopener noreferrer"
            href="https://calendar.app.google/on8fX3nrWppW7qow7"
            size="lg"
            className="group flex items-center gap-1 capitalize"
          >
            {/* <Image src="/square/square-icon.svg" alt="Square" width={12} height={12} /> */}
            {t('bookDemo')}
            <ChevronRightIcon className="w-5 h-5 -rotate-45 transition-transform duration-300 ease-in-out group-hover:translate-x-px group-hover:-translate-y-px" />
          </Button>
        </div>
      )}
    </>
  )
}
