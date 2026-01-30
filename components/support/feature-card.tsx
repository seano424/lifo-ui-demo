import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  features: {
    title: string
    description: string
  }[]
}

export function FeatureCard({ icon: Icon, title, description, features }: FeatureCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <Typography variant="h3">{title}</Typography>
        </div>
      </CardHeader>
      <CardContent>
        <Typography variant="p" color="muted">
          {description}
        </Typography>
        <ul className="space-y-2 text-sm mt-2">
          {features.map(feature => (
            <li key={feature.title} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0"></div>
              <span>
                <strong>{feature.title}:</strong> {feature.description}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
