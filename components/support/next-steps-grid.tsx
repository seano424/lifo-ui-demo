import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

interface NextStepItem {
  title: string
  description: string
  linkText: string
  linkHref: string
}

interface NextStepsGridProps {
  title: string
  items: NextStepItem[]
}

export function NextStepsGrid({ title, items }: NextStepsGridProps) {
  return (
    <div className="flex flex-col gap-6 pt-8 my-8 border-t border-muted/50">
      {/* Section Header */}
      <div className="text-center flex flex-col gap-2">
        <Typography
          variant="h2"
          className="text-2xl  bg-linear-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent"
        >
          {title}
        </Typography>
        <div className="w-16 h-1 bg-linear-to-r from-primary-400 to-primary-600 rounded-full mx-auto"></div>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {items.map(item => (
          <Link key={item.title} href={item.linkHref} className="block group">
            <Card className="h-full hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-0 bg-card hover:from-primary/5 hover:to-primary/10 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  {/* Title with icon */}
                  <div className="flex items-start justify-between">
                    <Typography
                      variant="h4"
                      className=" text-lg leading-tight group-hover:text-primary transition-colors"
                    >
                      {item.title}
                    </Typography>
                    <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-2">
                    <Typography variant="p" className="text-muted-foreground leading-relaxed">
                      {item.description}
                    </Typography>

                    {/* Link text with hover effect */}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
