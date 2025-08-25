'use client'
import { useTranslations } from 'next-intl'
import { Typography } from '@/components/ui/typography'

interface StatProps {
  label: string
  description: string
  subtext: string
}

function Stat({ label, description, subtext }: StatProps) {
  return (
    <div className="flex flex-col rounded-xl bg-gradient-to-b from-white via-white to-blue-50/30 border border-blue-100 shadow-lg hover:shadow-xl overflow-hidden transform hover:-translate-y-1 transition-all duration-300 h-full">
      {/* Header with plan name */}
      <div className="px-8 pt-6 pb-3 bg-gradient-to-br from-white to-blue-50/10 relative">
        {/* Subtle gradient overlay */}
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-tr from-transparent via-blue-100/5 to-purple-100/10 opacity-60"></div>
        <div className="relative z-10">
          <Typography
            variant="h2"
            className="text-4xl font-extrabold bg-clip-text text-center text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 mb-6"
          >
            {label}
          </Typography>

          <Typography
            variant="p"
            className="text-blue-700/80 text-center border-b border-blue-100 pb-5"
          >
            {description}
          </Typography>
        </div>
      </div>

      {/* Feature list section */}
      <div className="px-6 py-6 flex-grow bg-gradient-to-b from-blue-50/30 to-blue-50/50">
        <Typography variant="p" className="text-base text-center text-blue-600/80 max-w-xs">
          {subtext}
        </Typography>
      </div>
    </div>
  )
}

export function BusinessStats() {
  const t = useTranslations('landingpage.businessStats')

  return (
    <section className="w-full py-8 px-4 relative overflow-hidden">
      <div className="sm:max-w-7xl mx-auto relative z-10">
        <Typography
          variant="h2"
          as={'h2'}
          className="text-center mb-16 pb-4 text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
        >
          {t('title')}
        </Typography>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 px-4 max-w-6xl mx-auto">
          <Stat
            label={t('revenue.label')}
            description={t('revenue.description')}
            subtext={t('revenue.subtext')}
          />

          <Stat
            label={t('lossReduction.label')}
            description={t('lossReduction.description')}
            subtext={t('lossReduction.subtext')}
          />

          <Stat
            label={t('taxCredits.label')}
            description={t('taxCredits.description')}
            subtext={t('taxCredits.subtext')}
          />
        </div>
      </div>
    </section>
  )
}
