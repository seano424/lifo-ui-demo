'use client'

import { useTranslations } from 'next-intl'
import { Typography } from '@/components/ui/typography'

export function HeroDescription() {
  const t = useTranslations('landingpage.hero')

  return (
    <Typography variant="h5" className="lg:max-w-lg mx-auto text-center max-w-md font-normal">
      {t('subtitle')}
    </Typography>
  )
}
