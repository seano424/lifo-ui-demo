'use client'
import { FeatureCard, SupportPageWrapper } from '@/components/support'
import { AlertCircle, BarChart, Package, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'

const getFeatures = (t: ReturnType<typeof useTranslations<'marketing'>>) => [
  {
    icon: Package,
    title: t('features.inventoryTracking.title'),
    description: t('features.inventoryTracking.description'),
    features: [
      {
        title: t('features.inventoryTracking.items.0.title'),
        description: t('features.inventoryTracking.items.0.description'),
      },
      {
        title: t('features.inventoryTracking.items.1.title'),
        description: t('features.inventoryTracking.items.1.description'),
      },
      {
        title: t('features.inventoryTracking.items.2.title'),
        description: t('features.inventoryTracking.items.2.description'),
      },
      {
        title: t('features.inventoryTracking.items.3.title'),
        description: t('features.inventoryTracking.items.3.description'),
      },
    ],
  },
  {
    icon: BarChart,
    title: t('features.analyticsReporting.title'),
    description: t('features.analyticsReporting.description'),
    features: [
      {
        title: t('features.analyticsReporting.items.0.title'),
        description: t('features.analyticsReporting.items.0.description'),
      },
      {
        title: t('features.analyticsReporting.items.1.title'),
        description: t('features.analyticsReporting.items.1.description'),
      },
      {
        title: t('features.analyticsReporting.items.2.title'),
        description: t('features.analyticsReporting.items.2.description'),
      },
      {
        title: t('features.analyticsReporting.items.3.title'),
        description: t('features.analyticsReporting.items.3.description'),
      },
    ],
  },
  {
    icon: AlertCircle,
    title: t('features.stockAlerts.title'),
    description: t('features.stockAlerts.description'),
    features: [
      {
        title: t('features.stockAlerts.items.0.title'),
        description: t('features.stockAlerts.items.0.description'),
      },
      {
        title: t('features.stockAlerts.items.1.title'),
        description: t('features.stockAlerts.items.1.description'),
      },
      {
        title: t('features.stockAlerts.items.2.title'),
        description: t('features.stockAlerts.items.2.description'),
      },
      {
        title: t('features.stockAlerts.items.3.title'),
        description: t('features.stockAlerts.items.3.description'),
      },
    ],
  },
  {
    icon: TrendingUp,
    title: t('features.lifoOptimization.title'),
    description: t('features.lifoOptimization.description'),
    features: [
      {
        title: t('features.lifoOptimization.items.0.title'),
        description: t('features.lifoOptimization.items.0.description'),
      },
      {
        title: t('features.lifoOptimization.items.1.title'),
        description: t('features.lifoOptimization.items.1.description'),
      },
      {
        title: t('features.lifoOptimization.items.2.title'),
        description: t('features.lifoOptimization.items.2.description'),
      },
      {
        title: t('features.lifoOptimization.items.3.title'),
        description: t('features.lifoOptimization.items.3.description'),
      },
    ],
  },
]

export default function InventoryManagementPage() {
  const t = useTranslations('support.inventoryManagement')
  const features = getFeatures(t)

  return (
    <SupportPageWrapper
      title={t('title')}
      description={t('description')}
      readTime={t('readTime')}
      intro={t('intro')}
    >
      {/* Feature Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {features.map(feature => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </SupportPageWrapper>
  )
}
