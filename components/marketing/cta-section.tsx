'use client'
import { ArrowRight, Calendar, Check, Clock, Shield, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

interface CtaFeatureProps {
  icon: React.ReactNode
  title: string
  description: string
}

function CtaFeature({ icon, title, description }: CtaFeatureProps) {
  return (
    <div className="flex gap-4 items-start">
      <div className="text-blue-600 bg-blue-100/70 p-2.5 rounded-2xl border border-blue-200/50 shadow-sm">
        {icon}
      </div>
      <div>
        <Typography variant="h4" className="font-bold text-blue-800 mb-1">
          {title}
        </Typography>
        <Typography variant="p" className="text-blue-700/80">
          {description}
        </Typography>
      </div>
    </div>
  )
}

export function CtaSection() {
  const t = useTranslations('landingpage.cta')

  return (
    <section className="w-full px-4 my-8 relative overflow-hidden">
      {/* Background decorative elements */}

      <div className="max-w-7xl mx-auto relative z-10">
        <Typography
          as={'h2'}
          variant="h2"
          className="text-center mb-16 pb-4 text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
        >
          {t('title')}
        </Typography>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left column - Features */}
          <div className="space-y-8">
            <div className="space-y-6">
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
          <div className="flex flex-col rounded-xl bg-white border border-blue-100 shadow-xl p-8 mb-8 space-y-6">
            <div>
              <Typography variant="h3" className="text-2xl font-bold text-blue-800 mb-4">
                {t('card.title')}
              </Typography>
              <Typography variant="p" className="text-blue-700/80">
                {t('card.description')}
              </Typography>
            </div>

            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2">
                <div className="text-green-500">
                  <Check size={20} />
                </div>
                <Typography variant="p" className="text-gray-700 font-semibold">
                  {t('card.benefits.noCommitment')}
                </Typography>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-green-500">
                  <Check size={20} />
                </div>
                <Typography variant="p" className="text-gray-700 font-semibold">
                  {t('card.benefits.instantSetup')}
                </Typography>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-green-500">
                  <Check size={20} />
                </div>
                <Typography variant="p" className="text-gray-700 font-semibold">
                  {t('card.benefits.support')}
                </Typography>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full py-4 text-lg font-medium rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {t('card.button')} <ArrowRight size={18} />
            </Button>

            <Typography variant="p" className="text-sm text-center text-blue-700/60">
              {t('card.noCreditCard')}
            </Typography>
          </div>
        </div>
      </div>
    </section>
  )
}
