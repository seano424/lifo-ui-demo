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
      <div className="p-3 rounded-2xl border border-secondary-200/50 shadow-sm group-hover:shadow-md group-hover:shadow-secondary-500/10 transition-all duration-300">
        {icon}
      </div>
      <div className="flex flex-col gap-2">
        <Typography variant="h3">{title}</Typography>
        <Typography variant="p">{description}</Typography>
      </div>
    </div>
  )
}

export function FeaturesSummary() {
  const t = useTranslations('landingpage.features')

  return (
    <section className="w-full py-12 px-4 rounded-2xl relative z-10">
      <div className="absolute inset-0 -z-10 mask-[linear-gradient(to_top,black_80%,transparent)]">
        {/* <Image src="/images/bg.svg" alt="Background" fill className='object-cover  scale-x-200 rotate-180' /> */}
        {/* <Image src="/images/bg.svg" alt="Background" fill className='object-cover rotate-180 scale-x-[-1] -z-10' /> */}
      </div>
      <div className="max-w-5xl mx-auto flex flex-col gap-10">
        <Typography variant="h2" color="primary" className="text-center">
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

        <div className="flex flex-col gap-4 items-center justify-center">
          <Button asLink href="/features" size="xl">
            {t('discoverButton')}
          </Button>
          <Typography variant="muted">{t('noCommitment')}</Typography>
        </div>
      </div>
    </section>
  )
}
