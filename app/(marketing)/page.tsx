import { Hero } from '@/components/marketing/hero'
import { FeaturesSummary } from '@/components/marketing/features-summary'
import { RevealAnimation } from '@/components/ui/reveal-animation'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center bg-background">
      <div className="flex-1 w-full flex flex-col gap-24 items-center">
        <div className="flex-1 flex flex-col gap-12 w-full">
          <RevealAnimation direction="none">
            <Hero />
          </RevealAnimation>

          <RevealAnimation delay={0.2} direction="right">
            <FeaturesSummary />
          </RevealAnimation>

          {/* <RevealAnimation delay={0.4} direction="left">
            <BusinessStats />
          </RevealAnimation>

          <RevealAnimation delay={0.6} direction="up">
            <CtaSection />
          </RevealAnimation> */}
        </div>
      </div>
    </main>
  )
}
