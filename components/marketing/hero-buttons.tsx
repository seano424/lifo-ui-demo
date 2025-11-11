'use client'

import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/use-users'
import { LayoutDashboard, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function HeroButtons() {
  const t = useTranslations('landingpage.hero.buttons')
  const { data: currentUser } = useCurrentUser()

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full max-w-[calc(100vw-2rem)] sm:max-w-none mx-auto">
      <Button
        size="lg"
        asLink
        href="/dashboard"
        className={`w-full sm:w-auto px-4 sm:px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
          currentUser ? 'sm:px-12 sm:py-3 sm:text-lg sm:min-w-[300px]' : ''
        }`}
      >
        <LayoutDashboard size={currentUser ? 24 : 18} />
        {t('dashboard')}
      </Button>
      {!currentUser && (
        <Button
          asLink
          // Todo : Change to pricing page when it's ready
          href="/contact"
          size="lg"
          variant="outline"
          className="w-full sm:w-auto px-5 sm:px-6 py-3 rounded-2xl border-foreground/20 hover:border-foreground/40 transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles size={18} />
          {t('freeTrial')}
        </Button>
      )}
    </div>
  )
}
