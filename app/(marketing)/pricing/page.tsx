'use client'

import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Typography } from '@/components/ui/typography'
import { RevealAnimation } from '@/components/ui/reveal-animation'

export default function PricingPage() {
  const t = useTranslations('pricingpage')

  const plans = [
    {
      id: 'freeTrial',
      ctaLink: '/signup',
    },
    {
      id: 'light',
      ctaLink: '/signup',
    },
    {
      id: 'pro',
      ctaLink: '/signup',
    },
    // {
    //   id: 'enterprise',
    //   ctaLink: '/contact',
    // },
  ]

  return (
    <RevealAnimation direction="none">
      <section className="bg-white dark:bg-gray-900 min-h-screen pt-20 px-4 relative overflow-hidden">
        <div className="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6 flex flex-col gap-10">
          {/* Header */}
          <div className="flex flex-col gap-4 items-center justify-center">
            <Typography variant="h2" className="font-extrabold tracking-tight">
              {t('title')}
            </Typography>
            <Typography variant="h5" className="max-w-xl text-center">
              {t('subtitle')}
            </Typography>
          </div>

          {/* Pricing Cards Grid */}
          <div className="space-y-8 lg:grid lg:grid-cols-3 sm:gap-6 xl:gap-10 lg:space-y-0">
            {plans.map(plan => {
              return (
                <div
                  key={plan.id}
                  className="flex flex-col justify-between gap-4 p-6 mx-auto max-w-lg lg:text-center text-gray-900 bg-white rounded-lg border border-gray-100 shadow dark:border-gray-600 xl:p-8 dark:bg-gray-800 dark:text-white"
                >
                  <div className="flex flex-col gap-4">
                    {/* Plan Title */}
                    <Typography variant="h3" className="font-extrabold tracking-tight">
                      {t(`plans.${plan.id}.title`)}
                    </Typography>

                    {/* Description */}
                    <Typography variant="p" color="muted">
                      {t(`plans.${plan.id}.description`)}
                    </Typography>
                  </div>
                  <div className="flex flex-col gap-4 lg:min-h-64">
                    {/* Price */}
                    <div className="flex justify-start lg:justify-center items-baseline">
                      <Typography
                        variant="h3"
                        className="mr-2 font-extrabold tracking-tight"
                        color="secondary"
                      >
                        {t(`plans.${plan.id}.price`)}
                      </Typography>
                      {t.has(`plans.${plan.id}.period`) && (
                        <Typography variant="p" color="muted">
                          {t(`plans.${plan.id}.period`)}
                        </Typography>
                      )}
                    </div>

                    {/* Features List */}
                    <ul className="flex flex-col gap-4 text-left">
                      {Object.keys(
                        JSON.parse(JSON.stringify(t.raw(`plans.${plan.id}.features`))),
                      ).map(featureKey => (
                        <li key={featureKey} className="flex items-center space-x-3">
                          <Check className="shrink-0 w-5 h-5 text-green-500 dark:text-green-400" />
                          <Typography variant="p" color="muted">
                            {t(`plans.${plan.id}.features.${featureKey}`)}
                          </Typography>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <Link
                    href={plan.ctaLink}
                    className="text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:text-white dark:focus:ring-primary-900"
                  >
                    {t('common.getStarted')}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </RevealAnimation>
  )
}
