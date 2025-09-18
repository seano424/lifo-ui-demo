import { Typography } from '@/components/ui/typography'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RevealAnimation } from '@/components/ui/reveal-animation'
import { ArrowLeft, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function InventoryManagementPage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-5 py-12 space-y-8">
        
        {/* Navigation */}
        <RevealAnimation direction="none">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
            <span>•</span>
            <Link href="/support/workflows" className="hover:text-foreground transition-colors">Core Workflows</Link>
            <span>•</span>
            <span className="text-foreground">Inventory Management</span>
          </div>
        </RevealAnimation>
        
        {/* Article Header */}
        <RevealAnimation direction="none" delay={0.1}>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock size={14} />
                12 min read
              </div>
            </div>
            
            <Typography variant="h1" className="text-3xl sm:text-4xl">
              Inventory Management
            </Typography>
            
            <Typography variant="p" color="muted" className="text-lg">
              Master real-time inventory views, batch status monitoring, stock alerts, and reconciliation processes.
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
                This detailed inventory management guide is being prepared with comprehensive workflows and analytics insights.
              </Typography>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asLink href="/support">
                  Back to Knowledge Base
                  <ArrowRight size={16} className="ml-2" />
                </Button>
                <Button variant="outline" asLink href="/contact">
                  Get Management Help
                </Button>
              </div>
            </CardContent>
          </Card>
        </RevealAnimation>

        {/* Navigation */}
        <RevealAnimation delay={0.4} direction="up">
          <div className="flex justify-between items-center pt-8 border-t">
            <Link href="/support/workflows" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={16} />
              Back to Core Workflows
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