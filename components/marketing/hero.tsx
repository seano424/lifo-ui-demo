import Image from 'next/image'
import { Logo } from '@/components/ui/logo'
import { HeroButtons } from '@/components/marketing/hero-buttons'
import { HeroDescription } from '@/components/marketing/hero-description'
import { HeroHeading } from '@/components/marketing/hero-heading'

export function Hero() {
  return (
    <section
      aria-label="Hero section with LIFO introduction"
      className="flex flex-col sm:gap-6 gap-4 items-center w-full min-h-[calc(100vh)] justify-center relative"
    >
      <Logo variant="svg" size="xl" />

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
      <HeroHeading />
      <HeroDescription />
      <HeroButtons />
    </section>
  )
}
