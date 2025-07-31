import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { Bell, Calendar, Clock, Tablet } from 'lucide-react'

interface FeatureProps {
  icon: React.ReactNode
  title: string
  description: string
}

function Feature({ icon, title, description }: FeatureProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-start group">
      <div className="text-blue-600 bg-blue-100/70 p-3 rounded-lg border border-blue-200/50 shadow-sm group-hover:shadow-md group-hover:shadow-blue-500/10 transition-all duration-300">
        {icon}
      </div>
      <div>
        <Typography
          variant="h3"
          className="font-semibold mb-2 text-blue-800 group-hover:text-blue-600 transition-colors duration-300"
        >
          {title}
        </Typography>
        <Typography variant="p" className="text-blue-700/80">
          {description}
        </Typography>
      </div>
    </div>
  )
}

export function FeaturesSummary() {
  return (
    <section className="w-full px-4 rounded-2xl mb-10">
      <div className="max-w-5xl mx-auto">
        <Typography
          variant="h2"
          as={'h2'}
          className="text-center mb-16 pb-4 text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
        >
          Revolutionize Your Stock Control
        </Typography>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 py-8 px-8 rounded-xl bg-gradient-to-b from-white via-white to-blue-50/30 border border-blue-100 shadow-lg overflow-hidden h-full">
          <Feature
            icon={<Calendar size={28} className="text-blue-600" strokeWidth={1.5} />}
            title="Real-time Expiry Tracking"
            description="Never miss an expiration date with automated monitoring of your entire inventory."
          />

          <Feature
            icon={<Bell size={28} className="text-blue-600" strokeWidth={1.5} />}
            title="Predictive Alerts"
            description="Reduce waste by up to 30% with AI-powered notifications before products expire."
          />

          <Feature
            icon={<Clock size={28} className="text-blue-600" strokeWidth={1.5} />}
            title="Time Saving"
            description="75% reduction in time spent on manual receipt management and daily inventories."
          />

          <Feature
            icon={<Tablet size={28} className="text-blue-600" strokeWidth={1.5} />}
            title="Error-Free Operations"
            description="Elimination of human errors and administrative paperwork."
          />
        </div>

        <div className="flex flex-col items-center justify-center mt-16">
          <Button
            size="lg"
            className="px-8 py-3 text-lg font-medium rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
          >
            Discover LIFO
          </Button>
          <p className="mt-4 text-sm text-blue-700 opacity-80">No commitment!</p>
        </div>
      </div>
    </section>
  )
}
