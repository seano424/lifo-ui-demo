import Image from 'next/image'
import { HeroButtons } from '@/components/marketing/hero-buttons'
import { HeroDescription } from '@/components/marketing/hero-description'
import { HeroHeading } from '@/components/marketing/hero-heading'

export function Hero() {
  return (
    <section
      aria-label="Hero section with LIFO introduction"
      className="flex flex-col sm:gap-6 gap-4 items-center overflow-hidden w-full min-h-[calc(100vh)] justify-center relative"
    >
      {/* Background Gradient Blobs - VARIATION 1: Soft Corner Blobs (Recommended) */}
      <div className="absolute inset-0 -z-10 bg-white">
        {/* Top-right gradient blob */}
        <div className="absolute -top-40 -right-40 w-[800px] h-[800px]">
          <Image
            src="/images/bg-gradient-1.png"
            alt=""
            fill
            className="object-cover blur-3xl opacity-20"
            priority
          />
        </div>
        {/* Bottom-left gradient blob */}
        <div className="absolute -bottom-40 -left-40 w-[700px] h-[700px]">
          <Image
            src="/images/bg-mesh-2.jpg"
            alt=""
            fill
            className="object-cover blur-3xl opacity-15"
            priority
          />
        </div>
        {/* Subtle center accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
          <Image
            src="/images/blob-1.png"
            alt=""
            fill
            className="object-cover blur-3xl opacity-10"
          />
        </div>
      </div>

      {/* VARIATION 2: Dual Corner Mesh (Uncomment to use)
      <div className="absolute inset-0 -z-10 bg-white">
        <div className="absolute -top-32 -right-32 w-[900px] h-[900px]">
          <Image
            src="/images/bg-mesh-1.jpg"
            alt=""
            fill
            className="object-cover blur-3xl opacity-25"
            priority
          />
        </div>
        <div className="absolute -bottom-32 -left-32 w-[800px] h-[800px]">
          <Image
            src="/images/bg-gradient-2.png"
            alt=""
            fill
            className="object-cover blur-3xl opacity-20"
            priority
          />
        </div>
      </div>
      */}

      {/* VARIATION 3: Minimal Single Blob (Uncomment to use)
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white via-white to-blue-50/30">
        <div className="absolute top-0 right-0 w-[1000px] h-[1000px] -translate-y-1/4 translate-x-1/4">
          <Image
            src="/images/bg-gradient-1.png"
            alt=""
            fill
            className="object-cover blur-3xl opacity-30"
            priority
          />
        </div>
      </div>
      */}

      {/* VARIATION 4: Triple Blob Ambient (Uncomment to use)
      <div className="absolute inset-0 -z-10 bg-white">
        <div className="absolute -top-48 right-0 w-[700px] h-[700px]">
          <Image
            src="/images/bg-gradient-1.png"
            alt=""
            fill
            className="object-cover blur-3xl opacity-15"
            priority
          />
        </div>
        <div className="absolute bottom-0 -left-48 w-[800px] h-[800px]">
          <Image
            src="/images/bg-mesh-2.jpg"
            alt=""
            fill
            className="object-cover blur-3xl opacity-20"
            priority
          />
        </div>
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px]">
          <Image
            src="/images/bg-gradient-2.png"
            alt=""
            fill
            className="object-cover blur-3xl opacity-10"
          />
        </div>
      </div>
      */}

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
