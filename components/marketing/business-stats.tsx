'use client'
import { Award, Shield, Sparkles, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Typography } from '@/components/ui/typography'

interface StatProps {
  icon: React.ReactNode
  label: string
  description: string
  subtext: string
  accentColor: string
}

function Stat({ icon, label, description, subtext, accentColor }: StatProps) {
  return (
    <div
      className={`group relative flex flex-col p-8 rounded-3xl bg-card/50 border border-white/20 shadow-xl hover:shadow-2xl overflow-hidden transform hover:-translate-y-2 transition-all duration-500 h-full backdrop-blur-sm`}
    >
      {/* Floating sparkles */}
      <div className="absolute top-6 right-6 opacity-40 group-hover:opacity-80 transition-opacity duration-300">
        <Sparkles size={16} className="text-primary-400 animate-pulse" />
      </div>

      {/* Icon section */}
      <div className="relative z-10 mb-6">
        <div
          className={`w-16 h-16 rounded-2xl ${accentColor} bg-gradient-to-br from-primary-100/50 to-secondary-100/50 backdrop-blur-sm border border-primary-200/50 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>

      {/* Content section */}
      <div className="relative z-10 flex-grow flex flex-col text-left">
        <div className="flex flex-col">
          <Typography
            variant="h3"
            className="text-2xl font-bold text-foreground mb-3 group-hover:scale-105 transition-transform duration-300"
          >
            {label}
          </Typography>

          <Typography variant="p" className="text-foreground/80 text-base leading-relaxed mb-4">
            {description}
          </Typography>
        </div>

        <div className="mt-auto">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent mb-4"></div>
          <div className="flex items-center gap-2">
            <Typography variant="p" className="text-foreground/60 text-sm font-medium">
              {subtext}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  )
}

export function BusinessStats() {
  const t = useTranslations('landingpage.businessStats')

  return (
    <section className="w-full py-20 px-4 relative overflow-hidden">
      <div className="sm:max-w-7xl mx-auto relative z-10 flex flex-col gap-10">
        <div className="text-center items-center justify-center flex flex-col gap-6 mx-auto">
          <Typography variant="h2" color="primary" className="text-center">
            {t('title')}
          </Typography>

          <Typography variant="h5">{t('subtitle')}</Typography>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <Stat
            icon={<TrendingUp size={28} strokeWidth={2} />}
            label={t('revenue.label')}
            description={t('revenue.description')}
            subtext={t('revenue.subtext')}
            accentColor="text-primary-700"
          />

          <Stat
            icon={<Shield size={28} strokeWidth={2} />}
            label={t('lossReduction.label')}
            description={t('lossReduction.description')}
            subtext={t('lossReduction.subtext')}
            accentColor="text-primary-700"
          />

          <Stat
            icon={<Award size={28} strokeWidth={2} />}
            label={t('taxCredits.label')}
            description={t('taxCredits.description')}
            subtext={t('taxCredits.subtext')}
            accentColor="text-primary-800"
          />
        </div>
      </div>
    </section>
  )
}
