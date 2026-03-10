import { Check } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Typography } from '@/components/ui/typography'
import { RevealAnimation } from '@/components/ui/reveal-animation'
import { Badge } from '@/components/ui/badge'
import { BILLING_LIVE } from '@/lib/config/billing'

export const metadata: Metadata = {
  title: 'Pricing - Lifo.AI',
  description: 'Simple, transparent pricing for food waste management.',
}

const FREEMIUM_FEATURES = [
  'Expiry date tracking',
  'Unlimited users & stores',
  '1 category automation',
  '1 product automation',
]

const PRO_FEATURES = ['Everything in Freemium', 'Unlimited automations', 'Priority support']

export default function PricingPage() {
  return (
    <RevealAnimation direction="none">
      <section className="bg-white dark:bg-gray-900 min-h-screen pt-20 px-4 relative overflow-hidden">
        <div className="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6 flex flex-col gap-10">
          {/* Header */}
          <div className="flex flex-col gap-4 items-center justify-center">
            <Typography variant="h2" className="font-extrabold tracking-tight">
              Simple, transparent pricing
            </Typography>
            <Typography variant="h5" color="muted" className="max-w-xl text-center">
              Lifo is free while we&apos;re getting started. Paid plans are coming soon.
            </Typography>
          </div>

          {/* Plan Cards */}
          <div className="flex flex-col lg:flex-row gap-6 justify-center lg:max-w-3xl mx-auto w-full">
            {/* Freemium Card */}
            <div className="flex flex-col justify-between gap-4 p-6 flex-1 max-w-lg mx-auto w-full text-gray-900 bg-white rounded-lg border border-gray-100 shadow dark:border-gray-600 xl:p-8 dark:bg-gray-800 dark:text-white">
              <div className="flex flex-col gap-4">
                <Typography variant="h3" className="font-extrabold tracking-tight">
                  Freemium
                </Typography>
                <Typography variant="p" color="muted">
                  Everything you need to get started with expiry tracking.
                </Typography>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-baseline gap-2">
                  <Typography
                    variant="h3"
                    className="font-extrabold tracking-tight"
                    color="secondary"
                  >
                    Free
                  </Typography>
                  <Typography variant="p" color="muted">
                    forever
                  </Typography>
                </div>

                <ul className="flex flex-col gap-3">
                  {FREEMIUM_FEATURES.map(feature => (
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
                Get Started
              </Link>
            </div>

            {/* Pro Card */}
            <div className="flex flex-col justify-between gap-4 p-6 flex-1 max-w-lg mx-auto w-full text-gray-900 bg-white rounded-lg border border-gray-100 shadow dark:border-gray-600 xl:p-8 dark:bg-gray-800 dark:text-white">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Typography variant="h3" className="font-extrabold tracking-tight">
                    Pro
                  </Typography>
                  <Badge variant="secondary" size="sm">
                    Coming Soon
                  </Badge>
                </div>
                <Typography variant="p" color="muted">
                  For teams that want unlimited automation and priority support.
                </Typography>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-baseline gap-2">
                  <Typography
                    variant="h3"
                    className="font-extrabold tracking-tight"
                    color="secondary"
                  >
                    $39
                  </Typography>
                  <Typography variant="p" color="muted">
                    /mo
                  </Typography>
                </div>

                <ul className="flex flex-col gap-3">
                  {PRO_FEATURES.map(feature => (
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
                    Upgrade to Pro
                  </Link>
                ) : (
                  <button
                    disabled
                    className="cursor-not-allowed text-gray-400 bg-gray-100 dark:bg-gray-700 dark:text-gray-500 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                    type="button"
                  >
                    Coming Soon
                  </button>
                )}
                {!BILLING_LIVE && (
                  <Typography variant="extraSmall" color="muted" className="text-center">
                    $39/mo when billing launches. All members get 30 days notice.
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
