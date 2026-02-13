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
      <div className="sm:p-2 p-1.5 rounded-xl border border-secondary-200/50 shadow-sm group-hover:shadow-md group-hover:shadow-secondary-500/10 transition-all duration-300 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
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
    <section className="w-full py-12 px-4 rounded-2xl relative z-10">
      <div className="absolute inset-0 -z-10">
        {/* <Image src="/images/bg.svg" alt="Background" fill className='object-cover  scale-x-200 rotate-180' /> */}
        {/* <Image src="/images/bg.svg" alt="Background" fill className='object-cover rotate-180 scale-x-[-1] -z-10' /> */}
      </div>
      <div className="max-w-5xl mx-auto flex flex-col gap-4">
        <Typography variant="h2" className="text-center font-black tracking-tight">
          {t('title')}
        </Typography>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 p-8 overflow-hidden h-full">
          <Feature
            icon={<Calendar className="text-primary dark:text-primary-400" strokeWidth={1.5} />}
            title={t('expiryTracking.title')}
            description={t('expiryTracking.description')}
          />

          <Feature
            icon={<Bell className="text-primary dark:text-primary-400" strokeWidth={1.5} />}
            title={t('predictiveAlerts.title')}
            description={t('predictiveAlerts.description')}
          />

          <Feature
            icon={<Clock className="text-primary dark:text-primary-400" strokeWidth={1.5} />}
            title={t('timeSaving.title')}
            description={t('timeSaving.description')}
          />

          <Feature
            icon={<Tablet className="text-primary dark:text-primary-400" strokeWidth={1.5} />}
            title={t('compatibility.title')}
            description={t('compatibility.description')}
          />
        </div>
      </div>
    </section>
  )
}
