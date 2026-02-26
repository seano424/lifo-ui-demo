'use client'
import { Bell, Calendar, Clock, Tablet } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Typography } from '@/components/ui/typography'

interface FeatureProps {
  icon: React.ReactNode
  title: string
  description: string
}

function Feature({ icon, title, description }: FeatureProps) {
  return (
    <div className="flex flex-row gap-4 items-start group bg-muted rounded-2xl py-8 px-4">
      <div className="hidden sm:flex bg-black text-secondary-100 items-center justify-center p-2 rounded-lg">
        {icon}
      </div>
      <div className="flex flex-col gap-2">
        <Typography variant="h3" className="capitalize font-extrabold tracking-tight">
          {title}
        </Typography>
        <Typography variant="p">{description}</Typography>
      </div>
    </div>
  )
}

export function FeaturesSummary() {
  const t = useTranslations('landingpage.features')

  return (
    <section className="w-full rounded-2xl relative z-10 container flex flex-col gap-8 max-w-3xl mx-auto py-16">
      <Typography variant="h2" className="text-center font-black tracking-tight">
        {t('title')}
      </Typography>

      <Feature
        icon={<Calendar strokeWidth={1.5} />}
        title={t('expiryTracking.title')}
        description={t('expiryTracking.description')}
      />

      <Feature
        icon={<Bell strokeWidth={1.5} />}
        title={t('predictiveAlerts.title')}
        description={t('predictiveAlerts.description')}
      />

      <Feature
        icon={<Clock strokeWidth={1.5} />}
        title={t('timeSaving.title')}
        description={t('timeSaving.description')}
      />

      <Feature
        icon={<Tablet strokeWidth={1.5} />}
        title={t('compatibility.title')}
        description={t('compatibility.description')}
      />
    </section>
  )
}
