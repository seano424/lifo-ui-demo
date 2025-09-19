import { ArrowRight, ExternalLink } from 'lucide-react'
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
    <div className="space-y-6 pt-8 mt-8 border-t border-border/50">
      {/* Section Header */}
      <div className="text-center space-y-2">
        <Typography
          variant="h2"
          className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent"
        >
          {title}
        </Typography>
        <div className="w-16 h-1 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full mx-auto"></div>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {items.map(item => (
          <Link key={item.title} href={item.linkHref} className="block group">
            <Card className="h-full hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-0 bg-gradient-to-br from-background to-muted/20 hover:from-primary/5 hover:to-primary/10 cursor-pointer">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Title with icon */}
                  <div className="flex items-start justify-between">
                    <Typography
                      variant="h4"
                      className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors"
                    >
                      {item.title}
                    </Typography>
                    <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Description */}
                  <Typography variant="p" className="text-muted-foreground leading-relaxed">
                    {item.description}
                  </Typography>

                  {/* Link text with hover effect */}
                  <div className="inline-flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all duration-200 group-hover:text-primary-700">
                    <span>{item.linkText}</span>
                    <ExternalLink className="h-4 w-4" />
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
