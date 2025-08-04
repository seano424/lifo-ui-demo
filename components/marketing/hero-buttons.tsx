'use client'
import { Button } from '@/components/ui/button'
import { BookOpen, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function HeroButtons() {
  const t = useTranslations('landingpage.hero.buttons')

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
      <Button
        size="lg"
        className="px-6 py-3 rounded-md bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity flex items-center gap-2"
      >
        <Sparkles size={18} />
        {t('freeTrial')}
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="px-6 py-3 rounded-md border-foreground/20 hover:border-foreground/40 transition-colors flex items-center gap-2"
      >
        <BookOpen size={18} />
        {t('explore')}
      </Button>
    </div>
  )
}
