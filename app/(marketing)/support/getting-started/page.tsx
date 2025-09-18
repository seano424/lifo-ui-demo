import { Typography } from '@/components/ui/typography'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RevealAnimation } from '@/components/ui/reveal-animation'
import { ArrowLeft, ChevronRight, Clock, Zap } from 'lucide-react'
import Link from 'next/link'

const articles = [
  {
    title: 'Quick Start Guide',
    description: 'Welcome to LIFO - Overview and value proposition. Get started with the basics and understand what LIFO can do for your business.',
    href: '/support/getting-started/quick-start-guide',
    readTime: '5 min',
    featured: true
  },
  {
    title: 'System Requirements',
    description: 'iOS/Android compatibility, browser requirements, and technical specifications needed to run LIFO smoothly.',
    href: '/support/getting-started/system-requirements',
    readTime: '2 min'
  },
  {
    title: 'Account Setup Process',
    description: 'Step-by-step store onboarding guide to get your account configured properly from day one.',
    href: '/support/getting-started/account-setup',
    readTime: '8 min'
  },
  {
    title: 'User Roles & Permissions',
    description: 'Admin, Manager, and Employee role guides. Understand permissions and how to manage your team effectively.',
    href: '/support/getting-started/user-roles',
    readTime: '6 min'
  }
]

export default function GettingStartedPage() {
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
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <Typography variant="h1" className="text-3xl sm:text-4xl">
                Getting Started
              </Typography>
            </div>
            <Typography variant="p" color="muted" className="text-lg max-w-3xl">
              Everything you need to know to start using LIFO effectively. 
              Follow these guides to get up and running quickly.
            </Typography>
          </div>
        </RevealAnimation>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                            Start here
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
                Still have questions?
              </Typography>
              <Typography variant="p" color="muted" className="mb-4">
                Our support team is ready to help you get started.
              </Typography>
              <Button variant="outline" asLink href="/contact">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </RevealAnimation>
      </div>
    </main>
  )
}