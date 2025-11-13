'use client'
import { Bell, Calendar, Clock, Tablet } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

interface FeatureProps {
  icon: React.ReactNode
  title: string
  description: string
}

function Feature({ icon, title, description }: FeatureProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-start group">
      <div className="text-secondary-900 bg-secondary-100/70 p-3 rounded-2xl border border-secondary-200/50 shadow-sm group-hover:shadow-md group-hover:shadow-secondary-500/10 transition-all duration-300">
        {icon}
      </div>
      <div className="flex flex-col gap-2">
        <Typography variant="h3" className="font-semibold mb-2 ">
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
    <section className="w-full px-4 rounded-2xl mb-10">
      <div className="max-w-5xl mx-auto">
        <Typography
          variant="h2"
          as={'h2'}
          className="text-center mb-16 pb-4 text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-800 via-primary-700 to-secondary-900"
        >
          {t('title')}
        </Typography>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 py-8 px-8 rounded-2xl bg-card border shadow-lg overflow-hidden h-full">
          <Feature
            icon={<Calendar size={28} className="text-primary-900" strokeWidth={1.5} />}
            title={t('expiryTracking.title')}
            description={t('expiryTracking.description')}
          />

          <Feature
            icon={<Bell size={28} className="text-primary-900" strokeWidth={1.5} />}
            title={t('predictiveAlerts.title')}
            description={t('predictiveAlerts.description')}
          />

          <Feature
            icon={<Clock size={28} className="text-primary-900" strokeWidth={1.5} />}
            title={t('timeSaving.title')}
            description={t('timeSaving.description')}
          />

          <Feature
            icon={<Tablet size={28} className="text-primary-900" strokeWidth={1.5} />}
            title={t('compatibility.title')}
            description={t('compatibility.description')}
          />
        </div>

        <div className="flex flex-col items-center justify-center mt-16">
          <Button
            asLink
            href="/features"
            size="lg"
            className="px-8 py-3 text-lg font-medium rounded-2xl bg-gradient-to-r from-primary-900 to-secondary-800 text-white hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
          >
            {t('discoverButton')}
          </Button>
          <p className="mt-4 text-sm text-primary-700 opacity-80">{t('noCommitment')}</p>
        </div>
      </div>
    </section>
  )
}
