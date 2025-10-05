import { HeroBadge } from '@/components/marketing/hero-badge'
import { HeroButtons } from '@/components/marketing/hero-buttons'
import { HeroDescription } from '@/components/marketing/hero-description'
import { HeroHeading } from '@/components/marketing/hero-heading'

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="flex flex-col gap-4 items-center py-2 px-3 sm:py-12 sm:px-6 overflow-hidden w-full"
    >
      {/* Main content */}
      <div className="text-center w-full max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <HeroHeading />
        <HeroDescription />
        <HeroButtons />
        <div className="px-2">
          <HeroBadge />
        </div>
      </div>
    </section>
  )
}
