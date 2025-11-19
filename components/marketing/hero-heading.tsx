'use client'

import { useTranslations } from 'next-intl'
import { Typography } from '../ui/typography'

export function HeroHeading() {
  const t = useTranslations('landingpage')
  return (
    <Typography
      variant="h1"
      className="text-center max-w-md sm:max-w-xl md:max-w-3xl xl:max-w-4xl mx-auto"
    >
      {t('hero.title', {
        fallback: 'Smarter Inventory Decisions — Batch by Batch',
      })}{' '}
    </Typography>
  )
}
