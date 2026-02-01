'use client'

import { BarChart3, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Typography } from '@/components/ui/typography'

interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
  image?: React.ReactNode
  reversed?: boolean
}

function FeatureCard({ title, description, icon, image, reversed = false }: FeatureCardProps) {
  return (
    <div
      className={`flex flex-col justify-center ${reversed ? 'xl:flex-row-reverse' : 'xl:flex-row'} items-center gap-8 `}
    >
      {/* Content */}
      <div className="flex-1 flex flex-col gap-12 text-center xl:text-left">
        <div className="flex flex-col sm:flex-row items-center justify-center xl:justify-start gap-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0">
            {icon}
          </div>
          <Typography variant="h2">{title}</Typography>
        </div>
        <Typography variant="p" color="muted" className="max-w-xl mx-auto">
          {description}
        </Typography>
      </div>

      {/* Visual/Image */}
      <div className="flex-1 flex justify-center w-full">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-0 rounded-3xl blur-3xl"></div>
          <div className="relative bg-card backdrop-blur-sm rounded-3xl p-4 sm:p-6 xl:p-8 shadow-2xl border border-white/20 dark:bg-background">
            {image}
          </div>
        </div>
      </div>
    </div>
  )
}

function MockDashboard() {
  const t = useTranslations('featurespage.mockData.dashboard')

  return (
    <div className="w-full flex flex-col gap-12">
      <div className="rounded-2xl p-4 sm:p-6 dark:bg-background">
        <div className="flex items-center justify-between mb-3">
          <Typography variant="p" color="primary">
            {t('inventoryOverview')}
          </Typography>
          <TrendingUp size={20} className="text-primary-800 dark:text-primary-200" />
        </div>
        <div className="flex flex-col justify-between gap-2">
          <Typography variant="h3" color="primary">
            1,247 {t('items')}
          </Typography>
          <Typography variant="p" color="primary">
            ↗ +12% {t('fromLastMonth')}
          </Typography>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 bg-white/80 rounded-xl p-3 sm:p-4 border border-gray-100 dark:bg-background">
          <Typography variant="p">{t('expiringSoon')}</Typography>
          <Typography variant="h4">23</Typography>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 bg-white/80 rounded-xl p-3 sm:p-4 border border-gray-100 dark:bg-background">
          <Typography variant="p" color="muted">
            {t('lowStock')}
          </Typography>
          <Typography variant="h4">8</Typography>
        </div>
      </div>
    </div>
  )
}

function MockAnalytics() {
  const t = useTranslations('featurespage.mockData.dashboard')

  return (
    <div className="w-full flex flex-col gap-12">
      <div className="rounded-2xl p-4 sm:p-6 dark:bg-background">
        <Typography variant="h4">{t('performanceAnalytics')}</Typography>
        <div className="flex flex-col gap-12">
          <div className="flex justify-between items-center">
            <Typography variant="p">{t('wasteReduced')}</Typography>
            <Typography variant="p">-34%</Typography>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
            <div
              className="bg-linear-to-r from-primary-500 to-secondary-500 h-2 sm:h-3 rounded-full"
              style={{ width: '68%' }}
            ></div>
          </div>
          <div className="flex justify-between items-center">
            <Typography variant="p">{t('revenueIncrease')}</Typography>
            <Typography variant="p">+28%</Typography>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
            <div
              className="bg-linear-to-r from-secondary-500 to-primary-500 h-2 sm:h-3 rounded-full"
              style={{ width: '82%' }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FeaturesPage() {
  const t = useTranslations('featurespage')

  return (
    <div className="min-h-screen relative overflow-hidden pt-32 container">
      <div className="flex flex-col gap-12">
        {/* Header */}
        <div className="text-center flex flex-col gap-12">
          <Typography variant="h1">{t('title')}</Typography>
          <Typography variant="p" color="muted" className="max-w-xl mx-auto">
            {t('subtitle')}
          </Typography>
        </div>

        {/* Features */}
        <div className="items-center flex flex-col gap-12">
          <div className="w-full max-w-6xl">
            <FeatureCard
              title={t('features.dashboard.title')}
              description={t('features.dashboard.description')}
              icon={<BarChart3 size={32} />}
              image={<MockDashboard />}
              reversed
            />
          </div>

          <div className="w-full max-w-6xl">
            <FeatureCard
              title={t('features.analytics.title')}
              description={t('features.analytics.description')}
              icon={<TrendingUp size={32} />}
              image={<MockAnalytics />}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
