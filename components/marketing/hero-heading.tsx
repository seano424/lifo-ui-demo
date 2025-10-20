'use client'

import { useTranslations } from 'next-intl'
import { Logo } from '../ui/logo'
import { Typography } from '../ui/typography'

export function HeroHeading() {
  const t = useTranslations('landingpage')
  return (
    <header className="text-6xl md:text-5xl font-bold mb-6 leading-tight">
      <div className="flex items-center justify-center gap-4 mb-2">
        <Logo variant="icon" size="lg" className="w-20 lg:w-24" />
        <Typography
          as="h1"
          className="text-5xl md:text-7xl py-6 bg-clip-text text-transparent bg-gradient-to-r from-violet-700 via-indigo-400 to-blue-600"
        >
          LIFO
        </Typography>
      </div>
      <Typography as="h2" className="text-4xl md:text-6xl text-foreground/80">
        {t('hero.title', {
          fallback: 'Smarter Inventory Decisions — Batch by Batch',
        })}{' '}
      </Typography>
    </header>
  )
}
