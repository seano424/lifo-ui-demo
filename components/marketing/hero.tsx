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
      className="flex flex-col sm:gap-6 gap-4 items-center overflow-hidden w-full min-h-[calc(100vh-200px)] sm:min-h-screen justify-center relative"
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

      <div className="absolute inset-0 dark:block hidden mask-[linear-gradient(to_bottom,black_50%,transparent)]">
        <Image
          src="/images/bg.svg"
          alt="Background"
          fill
          className="object-cover rotate-180 scale-y-400 scale-x-150 brightness-30 contrast-150"
        />
      </div>

      <div className="relative z-10 flex flex-col gap-4 items-center justify-center">
        <Badge font="mono" className="flex gap-1 items-center">
          <div className="mr-1 bg-white dark:bg-gray-800 rounded p-1.5">
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
      </div>
    </section>
  )
}
