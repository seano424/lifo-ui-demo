import { HeroBadge } from '@/components/marketing/hero-badge'
import { HeroButtons } from '@/components/marketing/hero-buttons'
import { HeroDescription } from '@/components/marketing/hero-description'
import { HeroHeading } from '@/components/marketing/hero-heading'
import Image from 'next/image'
import { Logo } from '../ui/logo'

export function Hero() {
  return (
    <section
      aria-label="Hero section with LIFO introduction"
      className="flex flex-col gap-4 items-center py-2 px-3 sm:py-12 sm:px-6 overflow-hidden w-full min-h-[calc(100vh-10rem)] justify-center"
    >
      {/* Main content - min-h ensures hero takes up most of viewport (100vh - 10rem for header/footer) */}
      <div className="text-center w-full max-w-4xl mx-auto flex flex-col gap-6 items-center">
        <Logo size="xl" priority />
        <a
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
