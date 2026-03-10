import { Check } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Typography } from '@/components/ui/typography'
import { RevealAnimation } from '@/components/ui/reveal-animation'
import { Badge } from '@/components/ui/badge'
import { BILLING_LIVE } from '@/lib/config/billing'

export const metadata: Metadata = {
  title: 'Pricing - Lifo.AI',
  description: 'Simple, transparent pricing for food waste management.',
}

export default async function PricingPage() {
  const t = await getTranslations('pricingpage')
  const freemiumFeatures = t.raw('freemium.features') as string[]
  const proFeatures = t.raw('pro.features') as string[]

  return (
    <RevealAnimation direction="none">
      <section className="bg-white dark:bg-gray-900 min-h-screen pt-20 px-4 relative overflow-hidden">
        <div className="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6 flex flex-col gap-10">
          {/* Header */}
          <div className="flex flex-col gap-4 items-center justify-center">
            <Typography variant="h2" className="font-extrabold tracking-tight">
              {t('header')}
            </Typography>
            <Typography variant="h5" color="muted" className="max-w-xl text-center">
              {t('headerSubtitle')}
            </Typography>
          </div>

          {/* Plan Cards */}
          <div className="flex flex-col lg:flex-row gap-6 justify-center lg:max-w-3xl mx-auto w-full">
            {/* Freemium Card */}
            <div className="flex flex-col justify-between gap-4 p-6 flex-1 max-w-lg mx-auto w-full text-gray-900 bg-white rounded-lg border border-gray-100 shadow dark:border-gray-600 xl:p-8 dark:bg-gray-800 dark:text-white">
              <div className="flex flex-col gap-4">
                <Typography variant="h3" className="font-extrabold tracking-tight">
                  {t('freemium.name')}
                </Typography>
                <Typography variant="p" color="muted">
                  {t('freemium.description')}
                </Typography>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-baseline gap-2">
                  <Typography
                    variant="h3"
                    className="font-extrabold tracking-tight"
                    color="secondary"
                  >
                    {t('freemium.price')}
                  </Typography>
                  <Typography variant="p" color="muted">
                    {t('freemium.period')}
                  </Typography>
                </div>

                <ul className="flex flex-col gap-3">
                  {freemiumFeatures.map(feature => (
                    <li key={feature} className="flex items-center space-x-3">
                      <Check className="shrink-0 w-5 h-5 text-slate-500 dark:text-slate-400" />
                      <Typography variant="p" color="muted">
                        {feature}
                      </Typography>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/auth/sign-up"
                className="text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:text-white dark:focus:ring-primary-900"
              >
                {t('freemium.cta')}
              </Link>
            </div>

            {/* Pro Card */}
            <div className="flex flex-col justify-between gap-4 p-6 flex-1 max-w-lg mx-auto w-full text-gray-900 bg-white rounded-lg border border-gray-100 shadow dark:border-gray-600 xl:p-8 dark:bg-gray-800 dark:text-white">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Typography variant="h3" className="font-extrabold tracking-tight">
                    {t('pro.name')}
                  </Typography>
                  <Badge variant="secondary" size="sm">
                    {t('pro.badge')}
                  </Badge>
                </div>
                <Typography variant="p" color="muted">
                  {t('pro.description')}
                </Typography>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-baseline gap-2">
                  <Typography
                    variant="h3"
                    className="font-extrabold tracking-tight"
                    color="secondary"
                  >
                    {t('pro.price')}
                  </Typography>
                  <Typography variant="p" color="muted">
                    {t('pro.period')}
                  </Typography>
                </div>

                <ul className="flex flex-col gap-3">
                  {proFeatures.map(feature => (
                    <li key={feature} className="flex items-center space-x-3">
                      <Check className="shrink-0 w-5 h-5 text-slate-500 dark:text-slate-400" />
                      <Typography variant="p" color="muted">
                        {feature}
                      </Typography>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                {BILLING_LIVE ? (
                  <Link
                    href="/auth/sign-up"
                    className="text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:text-white dark:focus:ring-primary-900"
                  >
                    {t('pro.ctaUpgrade')}
                  </Link>
                ) : (
                  <button
                    disabled
                    className="cursor-not-allowed text-gray-400 bg-gray-100 dark:bg-gray-700 dark:text-gray-500 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                    type="button"
                  >
                    {t('pro.ctaComingSoon')}
                  </button>
                )}
                {!BILLING_LIVE && (
                  <Typography variant="extraSmall" color="muted" className="text-center">
                    {t('pro.finePrint')}
                  </Typography>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </RevealAnimation>
  )
}
