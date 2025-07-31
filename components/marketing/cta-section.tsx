import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { ArrowRight, Calendar, Check, Clock, Shield, Zap } from 'lucide-react'

interface CtaFeatureProps {
  icon: React.ReactNode
  title: string
  description: string
}

function CtaFeature({ icon, title, description }: CtaFeatureProps) {
  return (
    <div className="flex gap-4 items-start">
      <div className="text-blue-600 bg-blue-100/70 p-2.5 rounded-lg border border-blue-200/50 shadow-sm">
        {icon}
      </div>
      <div>
        <Typography variant="h4" className="font-bold text-blue-800 mb-1">
          {title}
        </Typography>
        <Typography variant="p" className="text-blue-700/80">
          {description}
        </Typography>
      </div>
    </div>
  )
}

export function CtaSection() {
  return (
    <section className="w-full px-4 my-8 relative overflow-hidden">
      {/* Background decorative elements */}

      <div className="max-w-7xl mx-auto relative z-10">
        <Typography
          as={'h2'}
          variant="h2"
          className="text-center mb-16 pb-4 text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
        >
          Switch to LIFO today
        </Typography>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left column - Features */}
          <div className="space-y-8">
            <div className="space-y-6">
              <CtaFeature
                icon={<Zap size={22} strokeWidth={1.5} />}
                title="Quick Setup"
                description="Ready-to-use solution in minutes. No complex configuration required."
              />

              <CtaFeature
                icon={<Calendar size={22} strokeWidth={1.5} />}
                title="30-day Free Trial"
                description="Test all features with no commitment. Easy cancellation at any time."
              />

              <CtaFeature
                icon={<Shield size={22} strokeWidth={1.5} />}
                title="Dedicated Support"
                description="Our team of experts guides you through every step of your journey."
              />

              <CtaFeature
                icon={<Clock size={22} strokeWidth={1.5} />}
                title="Immediate Results"
                description="Reduce waste and increase profits from the first week of use."
              />
            </div>
          </div>

          {/* Right column - CTA card */}
          <div className="flex flex-col rounded-xl bg-white border border-blue-100 shadow-xl p-8 mb-8 space-y-6">
            <div>
              <Typography variant="h3" className="text-2xl font-bold text-blue-800 mb-2">
                Ready to transform your inventory management?
              </Typography>
              <Typography variant="p" className="text-blue-700/80">
                Join over 500 businesses that trust LIFO to optimize their inventory and maximize
                profits.
              </Typography>
            </div>

            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2">
                <div className="text-green-500">
                  <Check size={20} />
                </div>
                <Typography variant="p" className="text-gray-700 font-semibold">
                  No commitment
                </Typography>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-green-500">
                  <Check size={20} />
                </div>
                <Typography variant="p" className="text-gray-700 font-semibold">
                  Instant setup
                </Typography>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-green-500">
                  <Check size={20} />
                </div>
                <Typography variant="p" className="text-gray-700 font-semibold">
                  24/7 Support
                </Typography>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full py-4 text-lg font-medium rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              Join the waitlist <ArrowRight size={18} />
            </Button>

            <Typography variant="p" className="text-sm text-center text-blue-700/60">
              No credit card required
            </Typography>
          </div>
        </div>
      </div>
    </section>
  )
}
