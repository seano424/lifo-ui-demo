'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { HeroButtons } from '@/components/marketing/hero-buttons'
import { HeroDescription } from '@/components/marketing/hero-description'
import { HeroHeading } from '@/components/marketing/hero-heading'
import { HeroSocialProof } from '@/components/marketing/hero-social-proof'
import { Badge } from '../ui/badge'
import { Typography } from '../ui/typography'

export function Hero() {
  const t = useTranslations('landingpage.hero.badge')
  return (
    <section
      aria-label="Hero section with lifo introduction"
      className="flex flex-col gap-4 items-center overflow-hidden w-full min-h-screen justify-center relative"
    >
      <div className="absolute inset-0 mask-[linear-gradient(to_bottom,black_50%,transparent)] dark:hidden">
        <div className="absolute inset-0 bg-linear-to-b from-white/95 to-white/50 z-10" />
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
        <div className="flex items-center gap-2">
          <Badge font="mono" size="lg" variant="elevated" className="flex gap-1 items-center py-3">
            <div className="mr-1 bg-white dark:bg-linear-to-br from-secondary-500 to-secondary-500 rounded p-1">
              <Image src="/square/square-icon.svg" alt="Square" width={12} height={12} />
            </div>
            {t('connectSquare')}
          </Badge>
          {/* <Typography variant="small" className='text-muted-foreground'>{t('noCreditCard')}</Typography> */}
        </div>
        <HeroHeading />
        <HeroDescription />

        <div className="flex items-center gap-4 flex-col md:flex-row lg:flex-col">
          <HeroButtons />
          <Typography variant="p" color="muted">
            {t('noCreditCard')}
          </Typography>
        </div>

        {/* <Badge className='rounded-sm' variant="successRounded" font="mono">
          {t('noCreditCard')}
        </Badge> */}

        <HeroSocialProof />
      </div>
    </section>
  )
}
