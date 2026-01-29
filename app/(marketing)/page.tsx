import Image from 'next/image'
import { Hero } from '@/components/marketing/hero'
import { BusinessStats } from '@/components/marketing/business-stats'
import { CtaSection } from '@/components/marketing/cta-section'
import { FeaturesSummary } from '@/components/marketing/features-summary'
import { RevealAnimation } from '@/components/ui/reveal-animation'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center relative">
      {/* Gradient Background - Spans multiple sections with natural fade */}
      <div className="absolute inset-0 -z-10 bg-white pointer-events-none">
        {/* Gradient fade mask - creates smooth transition to white at bottom */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.8) 85%, rgba(255,255,255,1) 100%)',
          }}
        />

        {/* Top-right gradient blob */}
        <div className="absolute -top-40 -right-40 w-[800px] h-[800px] animate-float-slow">
          <Image
            src="/images/bg-gradient-1.png"
            alt=""
            fill
            className="object-cover blur-3xl opacity-20"
            priority
          />
        </div>

        {/* Bottom-left gradient blob - extends into features section */}
        <div
          className="absolute top-[60vh] -left-40 w-[700px] h-[700px] animate-float-slower"
          style={{ animationDelay: '2s' }}
        >
          <Image
            src="/images/bg-mesh-2.jpg"
            alt=""
            fill
            className="object-cover blur-3xl opacity-15"
            priority
          />
        </div>

        {/* Subtle center accent */}
        <div
          className="absolute top-[40vh] left-1/2 -translate-x-1/2 w-[600px] h-[600px] animate-float-slowest"
          style={{ animationDelay: '4s' }}
        >
          <Image
            src="/images/blob-1.png"
            alt=""
            fill
            className="object-cover blur-3xl opacity-10"
          />
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col gap-24 items-center">
        <div className="flex-1 flex flex-col gap-12 w-full">
          <RevealAnimation direction="none">
            <Hero />
          </RevealAnimation>

          <RevealAnimation delay={0.2} direction="right">
            <FeaturesSummary />
          </RevealAnimation>

          <RevealAnimation delay={0.4} direction="left">
            <BusinessStats />
          </RevealAnimation>

          <RevealAnimation delay={0.6} direction="up">
            <CtaSection />
          </RevealAnimation>
        </div>
      </div>
    </main>
  )
}
