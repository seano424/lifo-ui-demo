import { Hero } from '@/components/marketing/hero'
import { FeaturesSummary } from '@/components/marketing/features-summary'
import { RevealAnimation } from '@/components/ui/reveal-animation'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center bg-background">
      <div className="relative w-full">
        <Hero />
      </div>

      <RevealAnimation delay={0.2} direction="right">
        <FeaturesSummary />
      </RevealAnimation>
    </main>
  )
}
