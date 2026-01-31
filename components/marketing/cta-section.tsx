'use client'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { ArrowRight, Calendar, Check, Clock, Shield, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface CtaFeatureProps {
  icon: React.ReactNode
  title: string
  description: string
}

function CtaFeature({ icon, title, description }: CtaFeatureProps) {
  return (
    <div className="flex gap-4 items-start">
      <div className="text-primary dark:text-primary-300 bg-primary-100/70 dark:bg-primary-900/30 p-2.5 rounded-2xl border border-primary-200/50 dark:border-primary-700/50 shadow-sm">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <Typography variant="h4">{title}</Typography>
        <Typography variant="p">{description}</Typography>
      </div>
    </div>
  )
}

export function CtaSection() {
  const t = useTranslations('landingpage.cta')

  return (
    <section className="w-full px-4 my-8 relative overflow-hidden mb-20">
      <div className="max-w-7xl mx-auto relative z-10 flex flex-col gap-10">
        <Typography variant="h2" color="primary" className="text-center">
          {t('title')}
        </Typography>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center max-w-3xl mx-auto">
          {/* Left column - Features */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-6">
              <CtaFeature
                icon={<Zap size={22} strokeWidth={1.5} />}
                title={t('features.quickSetup.title')}
                description={t('features.quickSetup.description')}
              />

              <CtaFeature
                icon={<Calendar size={22} strokeWidth={1.5} />}
                title={t('features.freeTrial.title')}
                description={t('features.freeTrial.description')}
              />

              <CtaFeature
                icon={<Shield size={22} strokeWidth={1.5} />}
                title={t('features.support.title')}
                description={t('features.support.description')}
              />

              <CtaFeature
                icon={<Clock size={22} strokeWidth={1.5} />}
                title={t('features.immediateResults.title')}
                description={t('features.immediateResults.description')}
              />
            </div>
          </div>

          {/* Right column - CTA card */}
          <div className="flex flex-col rounded-2xl bg-card border shadow-xl p-8 mb-8 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <Typography variant="h3">{t('card.title')}</Typography>
              <Typography variant="p">{t('card.description')}</Typography>
            </div>

            <div className="flex flex-col gap-3 py-4">
              <div className="flex items-center gap-2">
                <div className="text-secondary dark:text-secondary-400">
                  <Check size={20} />
                </div>
                <Typography variant="p">{t('card.benefits.noCommitment')}</Typography>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-secondary dark:text-secondary-400">
                  <Check size={20} />
                </div>
                <Typography variant="p">{t('card.benefits.instantSetup')}</Typography>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-secondary dark:text-secondary-400">
                  <Check size={20} />
                </div>
                <Typography variant="p">{t('card.benefits.support')}</Typography>
              </div>
            </div>

            <Button asLink href="/contact" size="xl">
              <span className="text-center">{t('card.button')}</span>{' '}
              <ArrowRight size={18} className="shrink-0" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
