import { ArrowLeft, Clock } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

interface SupportPageWrapperProps {
  children: React.ReactNode
  title: string
  description: string
  readTime: string
  intro?: string
}

export function SupportPageWrapper({
  children,
  title,
  description,
  readTime,
  intro,
}: SupportPageWrapperProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* Back Navigation */}
        <Button variant="ghost" size="sm" asChild className="w-fit p-2 h-auto">
          <Link href="/support" className="inline-flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to Support Center
          </Link>
        </Button>

        {/* Article Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <Typography
            variant="h3"
            as="h2"
            className="py-4 text-3xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-800 via-primary-700 to-secondary-900"
          >
            {title}
          </Typography>
          <Typography variant="p" color="muted" className="text-base sm:text-lg max-w-2xl">
            {description}
          </Typography>
          <div className="font-bold flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 font-black" />
            <span>{readTime}</span>
          </div>
        </div>

        {/* Optional Intro */}
        {intro && (
          <div className="text-center">
            <Typography variant="p" className="max-w-3xl mx-auto text-muted-foreground">
              {intro}
            </Typography>
          </div>
        )}

        {children}
      </div>
    </div>
  )
}
