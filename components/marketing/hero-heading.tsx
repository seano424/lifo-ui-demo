'use client'

import { useTranslations } from 'next-intl'
import { Typography } from '../ui/typography'

export function HeroHeading() {
  const t = useTranslations('landingpage')
  return (
    <Typography variant="h1" className="text-center mx-auto max-w-md lg:max-w-4xl">
      {t('hero.title', {
        fallback: 'Smarter Inventory Decisions — Batch by Batch',
      })}{' '}
    </Typography>
  )
}
