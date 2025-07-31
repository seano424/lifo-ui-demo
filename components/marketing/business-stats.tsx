import { Typography } from '@/components/ui/typography'

interface StatProps {
  value: string
  label: string
  description: string
  subtext: string
}

function Stat({ value, label, description, subtext }: StatProps) {
  return (
    <div className="flex flex-col rounded-xl bg-gradient-to-b from-white via-white to-blue-50/30 border border-blue-100 shadow-lg hover:shadow-xl overflow-hidden transform hover:-translate-y-1 transition-all duration-300 h-full">
      {/* Header with plan name */}
      <div className="px-8 pt-6 pb-3 bg-gradient-to-br from-white to-blue-50/10 relative">
        {/* Subtle gradient overlay */}
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-tr from-transparent via-blue-100/5 to-purple-100/10 opacity-60"></div>
        <div className="relative z-10">
          <Typography
            variant="h2"
            className="text-xl text-bold text-center font-medium text-blue-800 mb-1"
          >
            {label}
          </Typography>

          {/* Value with large display */}
          <div className="mb-2 flex justify-center">
            <span className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
              {value}
            </span>
          </div>

          <Typography
            variant="p"
            className="text-blue-700/80 text-center border-b border-blue-100 pb-5"
          >
            {description}
          </Typography>
        </div>
      </div>

      {/* Feature list section */}
      <div className="px-6 py-6 flex-grow bg-gradient-to-b from-blue-50/30 to-blue-50/50">
        <Typography variant="p" className="text-base text-center text-blue-600/80 max-w-xs">
          {subtext}
        </Typography>
      </div>
    </div>
  )
}

export function BusinessStats() {
  return (
    <section className="w-full py-8 px-4 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <Typography
          variant="h2"
          as={'h2'}
          className="text-center mb-16 pb-4 text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
        >
          Maximize Your Profits, Minimize Your Losses
        </Typography>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 px-4 max-w-6xl mx-auto">
          <Stat
            value="22%"
            label="Revenue Increase"
            description="Average increase in business revenue"
            subtext="Automatic discount suggestions to help move products quickly before they expire."
          />

          <Stat
            value="85%"
            label="Loss Reduction"
            description="Easily reduce waste and save money"
            subtext="Fewer expired products while doing less inventory management work."
          />

          <Stat
            value="1500€"
            label="Tax Credits"
            description="From the first month on donations"
            subtext="Increase your tax-deductible donations by connecting with a non-profit organization."
          />
        </div>
      </div>
    </section>
  )
}
