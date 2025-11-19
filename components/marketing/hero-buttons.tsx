'use client'

import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/use-users'
import { LayoutDashboard, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function HeroButtons() {
  const t = useTranslations('landingpage.hero.buttons')
  const { data: currentUser } = useCurrentUser()

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {currentUser && (
        <Button size="lg" asLink href="/dashboard">
          <LayoutDashboard size={24} />
          {t('dashboard')}
        </Button>
      )}
      {!currentUser && (
        <Button
          asLink
          href="/onboarding/create-account"
          size="lg"
          variant="outline"
          className="border-foreground/20 hover:border-foreground/40 transition-colors"
        >
          <Sparkles size={18} />
          {t('freeTrial')}
        </Button>
      )}
    </div>
  )
}
