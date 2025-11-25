'use client'

import { useTranslations } from 'next-intl'
import { Typography } from '@/components/ui/typography'

export function HeroDescription() {
  const t = useTranslations('landingpage.hero')

  return (
    <Typography variant="h3" className="font-normal font-sans text-primary max-w-xl mx-auto">
      {t('subtitle', {
        fallback:
          'Simplify your inventory management, optimize your costs and make informed decisions with our intelligent stock analysis platform.',
      })}
    </Typography>
  )
}
