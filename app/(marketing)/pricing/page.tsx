'use client'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

// import {Building2, Users} from 'lucide-react' --- IGNORE (It's when we're putting back the others pricing cards) ---

interface PricingCardProps {
  title: string
  subtitle: string
  price: string
  period?: string
  description: string
  features: string[]
  fees: { type: string; percentage: string }[]
  sellingPoint: string
  isPopular?: boolean
  isComingSoon?: boolean
  icon: React.ReactNode
}

function PricingCard({
  title,
  subtitle,
  price,
  period,
  description,
  fees,
  sellingPoint,
  isPopular = false,
  isComingSoon = false,
  icon,
}: PricingCardProps) {
  const t = useTranslations('pricingpage')

  return (
    <div className="group relative flex flex-col p-8 rounded-3xl backdrop-blur-md border transition-all duration-500 h-full bg-card border-white/20 shadow-lg hover:shadow-xl hover:from-white/90 hover:to-white/70">
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="text-center bg-linear-to-r from-primary-700 to-secondary-700 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 whitespace-nowrap">
            <Sparkles size={16} />
            {t('badges.mostPopular')}
          </div>
        </div>
      )}

      {/* Coming Soon badge */}
      {isComingSoon && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-linear-to-r from-gray-400 to-gray-500 text-white px-4 py-2 rounded-full text-xs  whitespace-nowrap">
            {t('badges.comingSoon')}
          </div>
        </div>
      )}

      {/* Icon and Title */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-linear-to-br from-primary-50 to-secondary-50 text-secondary-700">
          {icon}
        </div>
        <div className="flex flex-col gap-1">
          <Typography variant="h3">{title}</Typography>
          <Typography variant="p">{subtitle}</Typography>
        </div>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <Typography variant="h2">{price}</Typography>
          {period && <Typography variant="p">{period}</Typography>}
        </div>
      </div>

      {/* Description */}
      <Typography variant="p">{description}</Typography>

      {/* Fees */}
      {fees.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-linear-to-r from-primary-50/50 to-secondary-50/50 border border-primary-100/50">
          <Typography variant="h4">{t('common.winWinFees')}</Typography>
          {fees.map(fee => (
            <div key={fee.type} className="flex justify-between items-center">
              <Typography variant="p">{fee.type}</Typography>
              <Typography variant="p" color="primary">
                {fee.percentage}
              </Typography>
            </div>
          ))}
        </div>
      )}

      {/* Selling Point */}
      <div className="mb-6 p-4 rounded-2xl bg-card border border-secondary-100/50">
        <Typography variant="p" color="secondary">
          💡 {sellingPoint}
        </Typography>
      </div>

      {/* CTA Button */}
      {isComingSoon ? (
        <Button disabled={true} variant="subtle">
          {t('common.comingSoon')}
        </Button>
      ) : (
        <Button
          asLink={true}
          href="/onboarding/create-account"
          variant={isPopular ? 'secondary' : 'default'}
        >
          {t('common.getStarted')}
          <ArrowRight size={16} className="ml-2" />
        </Button>
      )}
    </div>
  )
}

export default function PricingPage() {
  const t = useTranslations('pricingpage')

  return (
    <div className="min-h-screen py-20 px-4 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-16">
          <Typography variant="h1" color="primary">
            {t('title')}
          </Typography>
          <Typography variant="p" color="muted">
            {t('subtitle')}
          </Typography>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-8 mb-16 mt-20 max-w-lg mx-auto">
          {/* Free Trial */}
          <PricingCard
            title={t('plans.freeTrial.title')}
            subtitle={t('plans.freeTrial.subtitle')}
            price={t('plans.freeTrial.price')}
            period={t('plans.freeTrial.period')}
            description={t('plans.freeTrial.description')}
            features={[
              t('plans.freeTrial.features.0'),
              t('plans.freeTrial.features.1'),
              t('plans.freeTrial.features.2'),
              t('plans.freeTrial.features.3'),
            ]}
            fees={[]}
            isPopular={true}
            sellingPoint={t('plans.freeTrial.sellingPoint')}
            icon={<Sparkles size={24} />}
          />

          {/* Light */}
          {/* <PricingCard
            title={t("plans.light.title")}
            subtitle={t("plans.light.subtitle")}
            price={t("plans.light.price")}
            period={t("plans.light.period")}
            description={t("plans.light.description")}
            features={[
              t("plans.light.features.0"),
              t("plans.light.features.1"),
              t("plans.light.features.2"),
              t("plans.light.features.3"),
            ]}
            fees={[
              {
                type: t("plans.light.fees.0.type"),
                percentage: t("plans.light.fees.0.percentage"),
              },
              {
                type: t("plans.light.fees.1.type"),
                percentage: t("plans.light.fees.1.percentage"),
              },
            ]}
            isComingSoon={true}
            sellingPoint={t("plans.light.sellingPoint")}
            icon={<Users size={24} />}
          /> */}

          {/* Pro */}
          {/* <PricingCard
            title={t("plans.pro.title")}
            subtitle={t("plans.pro.subtitle")}
            price={t("plans.pro.price")}
            period={t("plans.pro.period")}
            description={t("plans.pro.description")}
            features={[
              t("plans.pro.features.0"),
              t("plans.pro.features.1"),
              t("plans.pro.features.2"),
              t("plans.pro.features.3"),
              t("plans.pro.features.4"),
            ]}
            fees={[
              {
                type: t("plans.pro.fees.0.type"),
                percentage: t("plans.pro.fees.0.percentage"),
              },
              {
                type: t("plans.pro.fees.1.type"),
                percentage: t("plans.pro.fees.1.percentage"),
              },
            ]}
            sellingPoint={t("plans.pro.sellingPoint")}
            isComingSoon={true}
            icon={<Building2 size={24} />}
          /> */}

          {/* Enterprise */}
          {/* <PricingCard
            title={t("plans.enterprise.title")}
            subtitle={t("plans.enterprise.subtitle")}
            price={t("plans.enterprise.price")}
            description={t("plans.enterprise.description")}
            features={[
              t("plans.enterprise.features.0"),
              t("plans.enterprise.features.1"),
              t("plans.enterprise.features.2"),
              t("plans.enterprise.features.3"),
              t("plans.enterprise.features.4"),
            ]}
            fees={[
              {
                type: t("plans.enterprise.fees.0.type"),
                percentage: t("plans.enterprise.fees.0.percentage"),
              },
              {
                type: t("plans.enterprise.fees.1.type"),
                percentage: t("plans.enterprise.fees.1.percentage"),
              },
            ]}
            sellingPoint={t("plans.enterprise.sellingPoint")}
            isComingSoon={true}
            icon={<Building2 size={24} />}
          /> */}
        </div>

        {/* Bottom Note */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-card border border-primary-100">
            <Typography variant="p" className="text-sm text-foreground/70">
              💡 <strong>{t('common.note')}</strong> {t('common.pricingNote')}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  )
}
