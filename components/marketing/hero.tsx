import Image from 'next/image'
import { HeroButtons } from '@/components/marketing/hero-buttons'
import { HeroDescription } from '@/components/marketing/hero-description'
import { HeroHeading } from '@/components/marketing/hero-heading'
import { Logo } from '@/components/ui/logo'
// import { Typography } from '@/components/ui/typography'

export function Hero() {
  return (
    <section
      aria-label="Hero section with LIFO introduction"
      className="flex flex-col sm:gap-6 gap-4 items-center overflow-hidden w-full min-h-[calc(100vh-10rem)] justify-center"
    >
      <div className="flex flex-col items-center gap-2">
        <Logo variant="svg" />
        {/* <Typography variant="h2" color="primary" className="font-heading font-black">
          LIFO
        </Typography> */}
      </div>
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
