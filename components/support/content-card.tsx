import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

// Types pour différents contenus
interface Feature {
  title: string
  description: string
}

interface Step {
  number: number
  description: string
}

interface TroubleshootingItem {
  problem: string
  solution: string
}

interface ChecklistItem {
  text: string
  completed?: boolean
}

// Props du composant principal
interface ContentCardProps {
  title: string
  description?: string
  icon: LucideIcon
  variant?: 'feature' | 'steps' | 'troubleshooting' | 'checklist' | 'simple'
  // Données flexibles selon le variant
  features?: Feature[]
  steps?: Step[]
  troubleshootingItems?: TroubleshootingItem[]
  checklistItems?: ChecklistItem[]
  simpleItems?: string[]
  children?: ReactNode
}

export function ContentCard({
  title,
  description,
  icon: Icon,
  variant = 'simple',
  features = [],
  steps = [],
  troubleshootingItems = [],
  checklistItems = [],
  simpleItems = [],
  children,
}: ContentCardProps) {
  const renderContent = () => {
    switch (variant) {
      case 'feature':
        return (
          <div className="space-y-3">
            {description && (
              <Typography variant="p" className="text-sm text-muted-foreground">
                {description}
              </Typography>
            )}
            {features.length > 0 && (
              <div className="space-y-2">
                {features.map(feature => (
                  <div key={feature.title} className="space-y-1 flex gap-2 items-center mt-2">
                    <Typography variant="h4" className="text-sm font-semibold">
                      {feature.title}
                    </Typography>
                    <Typography variant="p" className="text-xs text-muted-foreground">
                      {feature.description}
                    </Typography>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'steps':
        return (
          <div className="space-y-3 text-sm">
            {steps.map(step => (
              <div key={step.number}>
                <strong>Step {step.number}:</strong> {step.description}
              </div>
            ))}
          </div>
        )

      case 'troubleshooting':
        return (
          <div className="space-y-3 text-sm">
            {troubleshootingItems.map(item => (
              <div key={item.problem}>
                <strong>{item.problem}:</strong> {item.solution}
              </div>
            ))}
          </div>
        )

      case 'checklist':
        return (
          <div className="space-y-2 text-sm">
            {checklistItems.map(item => (
              <div key={item.text} className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded border ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
                />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        )

      case 'simple':
        return (
          <div className="flex flex-col space-y-2 text-sm">
            {description && (
              <Typography variant="p" className="text-sm text-muted-foreground mb-3">
                {description}
              </Typography>
            )}
            {simpleItems.map(item => (
              <div key={item}>• {item}</div>
            ))}
            {children}
          </div>
        )
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          {variant === 'feature' ? (
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          ) : (
            <Icon className="h-5 w-5 text-primary" />
          )}
          <Typography variant="h3" className="text-lg font-semibold">
            {title}
          </Typography>
        </div>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  )
}
