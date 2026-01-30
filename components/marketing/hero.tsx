'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { HeroButtons } from '@/components/marketing/hero-buttons'
import { HeroDescription } from '@/components/marketing/hero-description'
import { HeroHeading } from '@/components/marketing/hero-heading'
import { Badge } from '../ui/badge'

export function Hero() {
  const t = useTranslations('landingpage.hero.badge')
  return (
    <section
      aria-label="Hero section with LIFO introduction"
      className="flex flex-col sm:gap-6 gap-4 items-center overflow-hidden w-full sm:min-h-screen justify-center py-20 sm:pb-40"
    >
      {/* <Logo variant="svg" size="xl" /> */}
      {/* <a
        href="https://www.producthunt.com/products/lifo-mvp-v1?embed=true&utm_source=badge-featured&utm_medium=badge"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View LIFO on Product Hunt"
      >
        <Image
          src="/badges/product-hunt-featured.svg"
          alt="LIFO MVP v1 - Our MVP v1 launches in ENG, FR and NL | Product Hunt"
          width={250}
          height={54}
          loading="lazy"
        />
      </a> */}
      <Badge font="mono" className="flex gap-1 items-center">
        <div className="mr-1 bg-white rounded p-1.5">
          <Image src="/square/square-icon.svg" alt="Square" width={12} height={12} />
        </div>
        {t('connectSquare')}
      </Badge>
      <HeroHeading />
      <HeroDescription />

      <HeroButtons />

      <Badge variant="primary" font="mono">
        {t('noCreditCard')}
      </Badge>
    </section>
  )
}
