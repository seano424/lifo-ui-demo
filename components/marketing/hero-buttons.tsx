'use client'

import { LayoutDashboard, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export function HeroButtons() {
  const t = useTranslations('landingpage.hero.buttons')

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
      <Button
        size="lg"
        asLink
        href="/dashboard"
        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity flex items-center gap-2"
      >
        <LayoutDashboard size={18} />
        Go to my Dashboard
      </Button>
      <Button
        asLink
        href="/pricing"
        size="lg"
        variant="outline"
        className="px-6 py-3 rounded-2xl border-foreground/20 hover:border-foreground/40 transition-colors flex items-center gap-2"
      >
        <Sparkles size={18} />
        {t('freeTrial')}
      </Button>
    </div>
  )
}
