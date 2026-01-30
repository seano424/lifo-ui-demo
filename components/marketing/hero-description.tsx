'use client'

import { useTranslations } from 'next-intl'
import { Typography } from '@/components/ui/typography'

export function HeroDescription() {
  const t = useTranslations('landingpage.hero')

  return (
    <Typography variant="h4" className="lg:max-w-lg mx-auto text-center max-w-md">
      {t('subtitle')}
    </Typography>
  )
}
