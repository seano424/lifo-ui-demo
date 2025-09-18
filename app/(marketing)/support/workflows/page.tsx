import { Typography } from '@/components/ui/typography'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RevealAnimation } from '@/components/ui/reveal-animation'
import { ArrowLeft, ChevronRight, Clock, Workflow } from 'lucide-react'
import Link from 'next/link'

const articles = [
  {
    title: 'Scan-In Process',
    description: 'Master the scan-in workflow: adding products to catalog, batch registration, image recognition tips, and troubleshooting scan issues.',
    href: '/support/workflows/scan-in',
    readTime: '10 min',
    featured: true
  },
  {
    title: 'Scan-Out Process',
    description: 'Learn to record sales, discount sales tracking, donation processing, waste recording, and bulk operations efficiently.',
    href: '/support/workflows/scan-out',
    readTime: '8 min'
  },
  {
    title: 'Inventory Management',
    description: 'Real-time inventory views, batch status monitoring, stock alerts setup, and physical vs digital reconciliation.',
    href: '/support/workflows/inventory-management',
    readTime: '12 min'
  }
]

export default function WorkflowsPage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto px-5 py-12 space-y-8">
        
        {/* Back Navigation */}
        <RevealAnimation direction="none">
          <Link href="/support" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
            Back to Knowledge Base
          </Link>
        </RevealAnimation>

        {/* Section Header */}
        <RevealAnimation direction="none" delay={0.1}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Workflow className="h-5 w-5 text-primary" />
              </div>
              <Typography variant="h1" className="text-3xl sm:text-4xl">
                Core Workflow Guides
              </Typography>
            </div>
            <Typography variant="p" color="muted" className="text-lg max-w-3xl">
              Master the essential processes that power your inventory management. 
              These workflows are the foundation of effective LIFO usage.
            </Typography>
          </div>
        </RevealAnimation>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {articles.map((article, index) => (
            <RevealAnimation key={article.href} delay={0.2 + index * 0.1} direction="up">
              <Link href={article.href}>
                <Card className={`h-full hover:shadow-lg transition-shadow duration-300 hover:border-primary/20 group cursor-pointer ${
                  article.featured ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <Typography variant="h3" className="text-lg font-semibold group-hover:text-primary transition-colors">
                          {article.title}
                        </Typography>
                        {article.featured && (
                          <div className="inline-flex items-center text-xs text-primary bg-primary/20 px-2 py-1 rounded-full">
                            Essential workflow
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Typography variant="p" color="muted" className="text-sm mb-4">
                      {article.description}
                    </Typography>
                    <div className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                      <Clock size={12} />
                      {article.readTime} read
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </RevealAnimation>
          ))}
        </div>

        {/* Help Section */}
        <RevealAnimation delay={0.6} direction="up">
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <Typography variant="h3" className="text-lg font-semibold mb-2">
                Need workflow assistance?
              </Typography>
              <Typography variant="p" color="muted" className="mb-4">
                Our team can help you optimize your specific workflows.
              </Typography>
              <Button variant="outline" asLink href="/contact">
                Get Help
              </Button>
            </CardContent>
          </Card>
        </RevealAnimation>
      </div>
    </main>
  )
}