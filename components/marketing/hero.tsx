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
      aria-label="Hero section with lifo introduction"
      className="flex flex-col sm:gap-6 gap-4 items-center overflow-hidden w-full min-h-[calc(100vh-200px)] sm:min-h-screen justify-center relative xl:pt-10"
    >
      <div className="absolute inset-0 mask-[linear-gradient(to_bottom,black_50%,transparent)] dark:hidden">
        <div className="absolute inset-0 bg-linear-to-b from-white/90 to-white/40 z-10" />
        <Image
          src="/images/bg.svg"
          alt="Background"
          fill
          className="object-cover rotate-180 scale-x-200"
        />
      </div>

      <div className="absolute inset-0 dark:block hidden">
        <div className="absolute inset-0 bg-linear-to-b from-background/90 to-background/40 z-10" />
        {/* <Image
          src="/images/bg.svg"
          alt="Background"
          fill
          className="object-cover translate-x-10  rotate-180 scale-y-400 scale-x-150 brightness-30 contrast-180"
        /> */}
        <Image
          src="/images/bg.svg"
          alt="Background"
          fill
          // className="object-cover rotate-180 scale-x-200 brightness-30 contrast-180"
          className="brightness-30 contrast-170 scale-y-200 scale-x-200 xl:-translate-x-10"
        />
      </div>

      <div className="relative z-10 flex flex-col gap-4 items-center justify-center container">
        <Badge font="mono" className="flex gap-1 items-center">
          <div className="mr-1 bg-white dark:bg-linear-to-br from-secondary-500 to-secondary-500 rounded p-1">
            <Image src="/square/square-icon.svg" alt="Square" width={12} height={12} />
          </div>
          {t('connectSquare')}
        </Badge>
        <HeroHeading />
        <HeroDescription />

        <HeroButtons />

        <Badge variant="ghost" font="mono">
          {t('noCreditCard')}
        </Badge>
      </div>
    </section>
  )
}
