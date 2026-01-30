'use client'

import {
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  CheckCircle,
  Clock,
  Shield,
  Smartphone,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
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
    <div className="py-12">
      <div
        className={`flex flex-col justify-center ${reversed ? 'xl:flex-row-reverse' : 'xl:flex-row'} items-center gap-8 xl:gap-12 `}
      >
        {/* Content */}
        <div className="flex-1 flex flex-col gap-6 text-center xl:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-center xl:justify-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary-100 to-secondary-100 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <Typography variant="h2">{title}</Typography>
          </div>
          <Typography variant="p" color="muted">
            {description}
          </Typography>
        </div>

        {/* Visual/Image */}
        <div className="flex-1 flex justify-center w-full">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-0 bg-linear-to-br from-primary-100/20 to-secondary-100/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-card backdrop-blur-sm rounded-3xl p-4 sm:p-6 xl:p-8 shadow-2xl border border-white/20">
              {image}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockDashboard() {
  const t = useTranslations('featurespage.mockData.dashboard')

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="bg-linear-to-r from-primary-50 to-secondary-50 rounded-2xl p-4 sm:p-6 border border-primary-100">
        <div className="flex items-center justify-between mb-3">
          <Typography variant="p" color="primary">
            {t('inventoryOverview')}
          </Typography>
          <TrendingUp size={20} className="text-primary-800" />
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 bg-white/80 rounded-xl p-3 sm:p-4 border border-gray-100">
          <Typography variant="p">{t('expiringSoon')}</Typography>
          <Typography variant="h4">23</Typography>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 bg-white/80 rounded-xl p-3 sm:p-4 border border-gray-100">
          <Typography variant="p" color="muted">
            {t('lowStock')}
          </Typography>
          <Typography variant="h4">8</Typography>
        </div>
      </div>
    </div>
  )
}

// Product translation keys for type safety
type ProductTranslationKey =
  | 'productOne'
  | 'productTwo'
  | 'productThree'
  | 'productFour'
  | 'productFive'

// Mock product data - moved outside component for performance
const PRODUCT_MOCK_DATA: ReadonlyArray<{
  name: ProductTranslationKey
  daysUntilExpiry: number
  stock: number
}> = [
  { name: 'productOne', daysUntilExpiry: 32, stock: 24 },
  { name: 'productTwo', daysUntilExpiry: 7, stock: 12 },
  { name: 'productThree', daysUntilExpiry: 22, stock: 20 },
  { name: 'productFour', daysUntilExpiry: 12, stock: 10 },
  { name: 'productFive', daysUntilExpiry: 18, stock: 25 },
]

// Generate dynamic expiry dates relative to today - moved outside component for performance
const generateExpiryDate = (daysFromNow: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split('T')[0] // YYYY-MM-DD format
}

function MockScanning() {
  const t = useTranslations('featurespage.mockData.scanning')

  return (
    <div className="w-full flex flex-col gap-4 flex flex-col items-center">
      <div className="bg-linear-to-br from-secondary-50 to-primary-50 rounded-2xl p-4 sm:p-6 border border-secondary-100 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <CheckCircle size={16} className="text-white" />
          </div>
          <Typography variant="p">{t('scanningActive')}</Typography>
        </div>

        <Typography variant="h3">{t('productScanned')}</Typography>
        <ul className="flex flex-col gap-4 max-h-80 overflow-y-auto list-none p-0">
          {PRODUCT_MOCK_DATA.map(({ name, daysUntilExpiry, stock }) => (
            <li key={name}>
              <Typography variant="p">{t(name)}</Typography>
              <Typography variant="p">
                {t('expiryInfo', {
                  date: generateExpiryDate(daysUntilExpiry),
                  stock,
                })}
              </Typography>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center justify-center">
        <Smartphone size={48} className="text-primary-400" />
      </div>
    </div>
  )
}

function MockAnalytics() {
  const t = useTranslations('featurespage.mockData.dashboard')

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="bg-linear-to-br from-white/90 to-white/70 rounded-2xl p-4 sm:p-6 border border-gray-200">
        <Typography variant="h4">{t('performanceAnalytics')}</Typography>
        <div className="flex flex-col gap-4">
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

function MockAI() {
  const t = useTranslations('featurespage.mockData.ai')

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="bg-linear-to-br from-primary-50 to-secondary-50 rounded-2xl p-6 border border-primary-100">
        <div className="flex items-center gap-3 mb-4">
          <Bot size={24} className="text-primary-800" />
          <Typography variant="h4">{t('title')}</Typography>
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-white/70 rounded-xl p-3 border border-primary-100/50">
            <div className="flex flex-col gap-1">
              <Typography variant="p">📦 {t('reorderMilk')}</Typography>
              <Typography variant="p">{t('reorderMilkDesc')}</Typography>
            </div>
          </div>
          <div className="bg-white/70 rounded-xl p-3 border border-primary-100/50">
            <div className="flex flex-col gap-1">
              <Typography variant="p">⚡ {t('promoteExpiring')}</Typography>
              <Typography variant="p">{t('promoteExpiringDesc')}</Typography>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FeaturesPage() {
  const t = useTranslations('featurespage')

  return (
    <div className="min-h-screen py-12 sm:py-16 lg:py-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 lg:mb-20">
          <Typography variant="h1">{t('title')}</Typography>
          <Typography variant="p" color="muted">
            {t('subtitle')}
          </Typography>
        </div>

        {/* Features */}
        <div className="flex flex-col items-center flex flex-col gap-12 lg:space-y-16">
          <div className="w-full max-w-6xl">
            {/* Real-time Dashboard */}
            <FeatureCard
              title={t('features.dashboard.title')}
              description={t('features.dashboard.description')}
              icon={<BarChart3 size={32} />}
              image={<MockDashboard />}
            />
          </div>

          <div className="w-full max-w-6xl">
            {/* Smart Scanning */}
            <FeatureCard
              title={t('features.scanning.title')}
              description={t('features.scanning.description')}
              icon={<Smartphone size={32} />}
              image={<MockScanning />}
              reversed
            />
          </div>

          <div className="w-full max-w-6xl">
            {/* Performance Analytics */}
            <FeatureCard
              title={t('features.analytics.title')}
              description={t('features.analytics.description')}
              icon={<TrendingUp size={32} />}
              image={<MockAnalytics />}
            />
          </div>

          <div className="w-full max-w-6xl">
            {/* AI-Powered Insights */}
            <FeatureCard
              title={t('features.ai.title')}
              description={t('features.ai.description')}
              icon={<Bot size={32} />}
              image={<MockAI />}
              reversed
            />
          </div>
        </div>

        {/* Additional Features Grid */}
        <div className="mt-16 lg:mt-24 flex flex-col ">
          <Typography variant="h2">{t('additionalFeatures.title')}</Typography>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                icon: <Calendar size={24} />,
                title: t('additionalFeatures.expiry.title'),
                description: t('additionalFeatures.expiry.description'),
              },
              {
                icon: <Shield size={24} />,
                title: t('additionalFeatures.security.title'),
                description: t('additionalFeatures.security.description'),
              },
              {
                icon: <Zap size={24} />,
                title: t('additionalFeatures.performance.title'),
                description: t('additionalFeatures.performance.description'),
              },
              {
                icon: <Target size={24} />,
                title: t('additionalFeatures.tracking.title'),
                description: t('additionalFeatures.tracking.description'),
              },
              {
                icon: <Clock size={24} />,
                title: t('additionalFeatures.timeSaving.title'),
                description: t('additionalFeatures.timeSaving.description'),
              },
              {
                icon: <Users size={24} />,
                title: t('additionalFeatures.collaboration.title'),
                description: t('additionalFeatures.collaboration.description'),
              },
            ].map(feature => (
              <div
                key={feature.title}
                className="group p-6 rounded-3xl bg-card/90 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-primary-100 to-secondary-100 flex items-center justify-center text-primary-800 mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <div className="flex flex-col gap-1">
                  <Typography variant="h3">{feature.title}</Typography>
                  <Typography variant="p">{feature.description}</Typography>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 lg:mt-24 text-center">
          <div className="flex flex-col items-center gap-4 rounded-3xl p-6 sm:p-8 lg:p-12 ">
            <Typography variant="h2" color="primary">
              {t('cta.title')}
            </Typography>
            <Typography variant="p" color="muted">
              {t('cta.description')}
            </Typography>
            <Button asLink href="/pricing">
              {t('cta.button')}
              <ArrowRight size={20} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
