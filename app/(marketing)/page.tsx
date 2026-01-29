import { Hero } from '@/components/marketing/hero'
import { BusinessStats } from '@/components/marketing/business-stats'
import { CtaSection } from '@/components/marketing/cta-section'
import { FeaturesSummary } from '@/components/marketing/features-summary'
import { RevealAnimation } from '@/components/ui/reveal-animation'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center relative">
      {/* Gradient Background - Brand purple/blue ambient glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        {/* CSS gradient base layer - soft purple/blue ambient atmosphere */}
        <div
          className="absolute inset-0 bg-white opacity-10"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 80% 20%, hsl(252 100% 92% / 0.5) 0%, transparent 50%), radial-gradient(ellipse 80% 50% at 20% 30%, hsl(227 100% 92% / 0.4) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 50% 50%, hsl(252 100% 95% / 0.3) 0%, transparent 50%), white',
          }}
        />

        {/* Gradient fade mask - extended visibility before fade */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.6) 65%, rgba(255,255,255,1) 85%)',
          }}
        />

        {/* Top-left purple blob - new for balance */}
        <div
          className="absolute -top-10 -left-20 w-[60vw] max-w-[700px] h-[60vw] max-h-[700px] animate-float-slowest will-change-transform"
          style={{ animationDelay: '0s' }}
        >
          <div
            className="absolute inset-0 blur-3xl opacity-50"
            style={{
              background:
                'radial-gradient(circle, hsl(252 100% 85% / 0.9) 0%, hsl(252 100% 90% / 0.6) 40%, transparent 70%)',
            }}
          />
        </div>

        {/* Top-right blue blob - reduced opacity */}
        <div className="absolute -top-40 -right-40 w-[60vw] max-w-[700px] h-[60vw] max-h-[700px] animate-float-slow will-change-transform">
          <div
            className="absolute inset-0 blur-3xl opacity-50"
            style={{
              background:
                'radial-gradient(circle, hsl(227 100% 85% / 0.9) 0%, hsl(227 100% 90% / 0.6) 40%, transparent 70%)',
            }}
          />
        </div>

        {/* Upper-left blue blob - moved up for visibility */}
        <div
          className="absolute top-[10vh] -left-40 w-[60vw] max-w-[650px] h-[60vw] max-h-[650px] animate-float-slower will-change-transform"
          style={{ animationDelay: '2s' }}
        >
          <div
            className="absolute inset-0 blur-3xl opacity-10"
            style={{
              background:
                'radial-gradient(circle, hsl(227 100% 88% / 0.9) 0%, hsl(227 100% 92% / 0.6) 40%, transparent 70%)',
            }}
          />
        </div>

        {/* Subtle center accent - purple/blue blend */}
        <div
          className="absolute top-[20vh] left-1/2 -translate-x-1/2 w-[55vw] max-w-[600px] h-[55vw] max-h-[600px] animate-float-slowest will-change-transform"
          style={{ animationDelay: '4s' }}
        >
          <div
            className="absolute inset-0 blur-3xl opacity-50"
            style={{
              background:
                'radial-gradient(circle, hsl(240 100% 88% / 0.8) 0%, hsl(240 100% 92% / 0.5) 40%, transparent 70%)',
            }}
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
