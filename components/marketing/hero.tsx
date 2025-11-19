import { HeroBadge } from '@/components/marketing/hero-badge'
import { HeroButtons } from '@/components/marketing/hero-buttons'
import { HeroDescription } from '@/components/marketing/hero-description'
import { HeroHeading } from '@/components/marketing/hero-heading'
import Image from 'next/image'
import { Logo } from '../ui/logo'

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="flex flex-col gap-4 items-center py-2 px-3 sm:py-12 sm:px-6 overflow-hidden w-full min-h-[calc(100vh-10rem)] justify-center"
    >
      {/* Main content */}
      <div className="text-center w-full max-w-4xl mx-auto flex flex-col gap-6 items-center">
        <Logo size="xl" />
        <a
          href="https://www.producthunt.com/products/lifo-mvp-v1?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-lifo&#0045;mvp&#0045;v1"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1038801&theme=light&t=1763572828487"
            alt="LIFO&#0032;MVP&#0032;v1 - Our&#0032;MVP&#0032;v1&#0032;launches&#0032;in&#0032;ENG&#0044;&#0032;FR&#0032;and&#0032;NL | Product Hunt"
            width="250"
            height="54"
          />
        </a>

        <div className="flex flex-col gap-6 items-center">
          <HeroHeading />
          <HeroDescription />
        </div>

        <HeroButtons />

        <HeroBadge />
      </div>
    </section>
  )
}
