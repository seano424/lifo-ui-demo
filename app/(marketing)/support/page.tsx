import { Typography } from '@/components/ui/typography'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RevealAnimation } from '@/components/ui/reveal-animation'
import { 
  BookOpen, 
  Zap, 
  Users, 
  Workflow,
  ScanLine,
  Package,
  ChevronRight,
  Clock
} from 'lucide-react'
import Link from 'next/link'

const supportSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Everything you need to know to start using LIFO effectively',
    icon: Zap,
    articles: [
      {
        title: 'Quick Start Guide',
        description: 'Welcome to LIFO - Overview and value proposition',
        href: '/support/getting-started/quick-start-guide',
        readTime: '5 min'
      },
      {
        title: 'System Requirements',
        description: 'iOS/Android compatibility, browser requirements',
        href: '/support/getting-started/system-requirements',
        readTime: '2 min'
      },
      {
        title: 'Account Setup Process',
        description: 'Step-by-step store onboarding',
        href: '/support/getting-started/account-setup',
        readTime: '8 min'
      },
      {
        title: 'User Roles & Permissions',
        description: 'Admin, Manager, and Employee role guides',
        href: '/support/getting-started/user-roles',
        readTime: '6 min'
      }
    ]
  },
  {
    id: 'workflows',
    title: 'Core Workflow Guides',
    description: 'Master the essential processes that power your inventory management',
    icon: Workflow,
    articles: [
      {
        title: 'Scan-In Process',
        description: 'Adding products, batch registration, and troubleshooting',
        href: '/support/workflows/scan-in',
        readTime: '10 min'
      },
      {
        title: 'Scan-Out Process',
        description: 'Recording sales, discounts, donations, and waste',
        href: '/support/workflows/scan-out',
        readTime: '8 min'
      },
      {
        title: 'Inventory Management',
        description: 'Real-time views, alerts, and reconciliation',
        href: '/support/workflows/inventory-management',
        readTime: '12 min'
      }
    ]
  }
]

export default function SupportPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-24 items-center">
        <div className="flex-1 flex flex-col gap-12 max-w-6xl px-5 sm:p-5 w-full">
          
          {/* Hero Section */}
          <RevealAnimation direction="none">
            <div className="text-center space-y-6 py-12">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <BookOpen size={16} />
                Knowledge Base
              </div>
              <Typography variant="h1" className="text-4xl sm:text-5xl">
                LIFO Support Center
              </Typography>
              <Typography variant="p" color="muted" className="text-xl max-w-2xl mx-auto">
                Master your inventory management with our comprehensive guides. 
                Everything you need to use LIFO like a pro.
              </Typography>
            </div>
          </RevealAnimation>

          {/* Support Sections */}
          <div className="space-y-16">
            {supportSections.map((section, sectionIndex) => (
              <RevealAnimation 
                key={section.id} 
                delay={0.2 * (sectionIndex + 1)} 
                direction="up"
              >
                <div className="space-y-6">
                  {/* Section Header */}
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <section.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <Typography variant="h2" className="text-2xl font-bold">
                        {section.title}
                      </Typography>
                      <Typography variant="p" color="muted">
                        {section.description}
                      </Typography>
                    </div>
                  </div>

                  {/* Articles Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {section.articles.map((article) => (
                      <Link key={article.href} href={article.href}>
                        <Card className="h-full hover:shadow-lg transition-shadow duration-300 hover:border-primary/20 group cursor-pointer">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <Typography variant="h3" className="text-lg font-semibold group-hover:text-primary transition-colors">
                                {article.title}
                              </Typography>
                              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <Typography variant="p" color="muted" className="text-sm mb-3">
                              {article.description}
                            </Typography>
                            <div className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                              <Clock size={12} />
                              {article.readTime} read
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              </RevealAnimation>
            ))}
          </div>

          {/* CTA Section */}
          <RevealAnimation delay={0.8} direction="up">
            <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <CardContent className="p-8 text-center">
                <Typography variant="h3" className="text-xl font-semibold mb-3">
                  Need More Help?
                </Typography>
                <Typography variant="p" color="muted" className="mb-6">
                  Can't find what you're looking for? Our support team is here to help.
                </Typography>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="outline" asLink href="/contact">
                    Contact Support
                  </Button>
                  <Button asLink href="/onboarding/create-account">
                    Start Your Free Trial
                  </Button>
                </div>
              </CardContent>
            </Card>
          </RevealAnimation>
        </div>
      </div>
    </main>
  )
}