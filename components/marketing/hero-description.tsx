'use client'
import { Typography } from '@/components/ui/typography'
import { useTranslations } from 'next-intl'

export function HeroDescription() {
  const t = useTranslations('landingpage.hero')

  return (
    <Typography variant="h3" as="p" className="mb-12 text-muted-foreground max-w-3xl mx-auto">
      {t('subtitle', {
        fallback:
          'Simplify your inventory management, optimize your costs and make informed decisions with our intelligent stock analysis platform.',
      })}
    </Typography>
  )
}
