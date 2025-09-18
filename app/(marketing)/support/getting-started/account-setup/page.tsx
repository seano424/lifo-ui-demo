import { Typography } from '@/components/ui/typography'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RevealAnimation } from '@/components/ui/reveal-animation'
import { ArrowLeft, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function AccountSetupPage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-5 py-12 space-y-8">
        
        {/* Navigation */}
        <RevealAnimation direction="none">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
            <span>•</span>
            <Link href="/support/getting-started" className="hover:text-foreground transition-colors">Getting Started</Link>
            <span>•</span>
            <span className="text-foreground">Account Setup Process</span>
          </div>
        </RevealAnimation>
        
        {/* Article Header */}
        <RevealAnimation direction="none" delay={0.1}>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock size={14} />
                8 min read
              </div>
            </div>
            
            <Typography variant="h1" className="text-3xl sm:text-4xl">
              Account Setup Process
            </Typography>
            
            <Typography variant="p" color="muted" className="text-lg">
              Follow this comprehensive step-by-step guide to set up your LIFO account and configure your store for optimal performance.
            </Typography>
          </div>
        </RevealAnimation>

        {/* Content Placeholder */}
        <RevealAnimation delay={0.2} direction="up">
          <Card>
            <CardContent className="p-8 text-center">
              <Typography variant="h3" className="text-xl font-semibold mb-4">
                Content Coming Soon
              </Typography>
              <Typography variant="p" color="muted" className="mb-6">
                This detailed guide is currently being prepared. In the meantime, you can start your setup process directly.
              </Typography>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asLink href="/onboarding/create-account">
                  Start Account Setup
                  <ArrowRight size={16} className="ml-2" />
                </Button>
                <Button variant="outline" asLink href="/contact">
                  Get Setup Help
                </Button>
              </div>
            </CardContent>
          </Card>
        </RevealAnimation>

        {/* Navigation */}
        <RevealAnimation delay={0.4} direction="up">
          <div className="flex justify-between items-center pt-8 border-t">
            <Link href="/support/getting-started" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={16} />
              Back to Getting Started
            </Link>
            <Button variant="outline" asLink href="/contact">
              Need Help?
            </Button>
          </div>
        </RevealAnimation>
      </div>
    </main>
  )
}