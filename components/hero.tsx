import { HeroBadge } from '@/components/marketing/hero-badge'
import { HeroButtons } from '@/components/marketing/hero-buttons'
import { HeroDescription } from '@/components/marketing/hero-description'
import { HeroDivider } from '@/components/marketing/hero-divider'
import { HeroHeading } from '@/components/marketing/hero-heading'

export function Hero() {
  return (
    <div className="flex flex-col gap-4 items-center py-6 px-4 ">
      {/* Main content */}
      <div className="text-center max-w-4xl mx-auto">
        <HeroHeading />
        <HeroDescription />
        <HeroButtons />
        <HeroBadge />
      </div>
      <HeroDivider />
    </div>
  )
}
