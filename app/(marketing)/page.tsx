import { Hero } from '@/components/hero'
import { BusinessStats } from '@/components/marketing/business-stats'
import { CtaSection } from '@/components/marketing/cta-section'
import { Divider } from '@/components/marketing/divider'
import { FeaturesSummary } from '@/components/marketing/features-summary'
import { RevealAnimation } from '@/components/ui/reveal-animation'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-24 items-center">
        <div className="flex-1 flex flex-col gap-12 max-w-6xl px-5 sm:p-5 w-full">
          <RevealAnimation direction="none">
            <Hero />
          </RevealAnimation>
          <Divider />
          <RevealAnimation delay={0.2} direction="right">
            <FeaturesSummary />
          </RevealAnimation>
          <Divider />
          <RevealAnimation delay={0.4} direction="left">
            <BusinessStats />
          </RevealAnimation>
          <Divider />
          <RevealAnimation delay={0.6} direction="up">
            <CtaSection />
          </RevealAnimation>
        </div>
      </div>
    </main>
  )
}
