'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight, Clock, Workflow, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

interface SupportArticle {
  title: string
  description: string
  href: string
  readTime: string
  comingSoon?: boolean
}

interface SupportSection {
  id: string
  title: string
  description: string
  icon: LucideIcon
  articles: SupportArticle[]
}

const getSupportSections = (t: ReturnType<typeof useTranslations<'marketing'>>): SupportSection[] => [
  {
    id: 'getting-started',
    title: t('sections.gettingStarted.title'),
    description: t('sections.gettingStarted.description'),
    icon: Zap,
    articles: [
      {
        title: t('articles.quickStartGuide.title'),
        description: t('articles.quickStartGuide.description'),
        href: '/support/quick-start-guide',
        readTime: t('articles.quickStartGuide.readTime'),
      },
      {
        title: t('articles.inventoryManagement.title'),
        description: t('articles.inventoryManagement.description'),
        href: '/support/inventory-management',
        readTime: t('articles.inventoryManagement.readTime'),
      },
      {
        title: t('articles.scanInProcess.title'),
        description: t('articles.scanInProcess.description'),
        href: '/support/scan-in',
        readTime: t('articles.scanInProcess.readTime'),
      },
    ],
  },
  {
    id: 'workflows',
    title: t('sections.workflowsProcesses.title'),
    description: t('sections.workflowsProcesses.description'),
    icon: Workflow,
    articles: [
      {
        title: t('articles.multiStoreManagement.title'),
        description: t('articles.multiStoreManagement.description'),
        href: '/support/multi-store',
        readTime: t('articles.multiStoreManagement.readTime'),
        comingSoon: true,
      },
      {
        title: t('articles.userRolesPermissions.title'),
        description: t('articles.userRolesPermissions.description'),
        href: '/support/roles-permissions',
        readTime: t('articles.userRolesPermissions.readTime'),
        comingSoon: true,
      },
      {
        title: t('articles.scanOutProcess.title'),
        description: t('articles.scanOutProcess.description'),
        href: '/support/scan-out',
        readTime: t('articles.scanOutProcess.readTime'),
        comingSoon: true,
      },
    ],
  },
  // {
  //   id: 'products',
  //   title: 'Product Management',
  //   description: 'Managing your inventory catalog and product data',
  //   icon: Package,
  //   articles: [
  //     {
  //       title: 'Adding Products',
  //       description: 'Creating and configuring product entries',
  //       href: '/support/adding-products',
  //       readTime: '7 min'
  //     },
  //     {
  //       title: 'Barcode Scanning',
  //       description: 'Working with barcodes and scanning',
  //       href: '/support/barcode-scanning',
  //       readTime: '5 min'
  //     },
  //     {
  //       title: 'Product Categories',
  //       description: 'Organizing products with categories and tags',
  //       href: '/support/categories',
  //       readTime: '8 min'
  //     }
  //   ]
  // }
]

export default function SupportPage() {
  const t = useTranslations('support.mainPage')
  const sections = getSupportSections(t)

  return (
    <main className="min-h-screen py-20 px-4 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-16">
          <Typography
            as="h1"
            className="text-center text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-800 via-primary-700 to-secondary-900 mb-6"
          >
            {t('title')}
          </Typography>
          <Typography
            variant="p"
            className="text-center text-xl text-foreground/70 max-w-2xl mx-auto leading-relaxed"
          >
            {t('subtitle')}
          </Typography>
        </div>

        {/* Support Sections */}
        <div className="space-y-8 sm:space-y-12">
          {sections.map(section => (
            <div key={section.id} className="space-y-4 sm:space-y-6">
              {/* Section Header */}
              <div className="flex items-start gap-3 sm:items-center">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <section.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="min-w-0 flex flex-col">
                  <Typography variant="h2" className="text-lg sm:text-xl font-semibold">
                    {section.title}
                  </Typography>
                  <Typography variant="p" color="muted" className="text-sm sm:text-base">
                    {section.description}
                  </Typography>
                </div>
              </div>

              {/* Articles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {section.articles.map(article =>
                  article.comingSoon ? (
                    <Card key={article.href} className="h-full opacity-60 cursor-not-allowed">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <Typography
                            variant="h3"
                            className="text-sm sm:text-base font-medium leading-tight text-muted-foreground"
                          >
                            {article.title}
                          </Typography>
                          <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs font-medium rounded-md">
                            {t('common.comingSoon')}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Typography
                          variant="p"
                          color="muted"
                          className="text-xs sm:text-sm mb-3 line-clamp-2"
                        >
                          {article.description}
                        </Typography>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground font-bold">
                          <Clock className="h-3 w-3 " />
                          <span>{article.readTime}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Link key={article.href} href={article.href}>
                      <Card className="h-full hover:shadow-md transition-shadow duration-200 cursor-pointer">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <Typography
                              variant="h3"
                              className="text-sm sm:text-base font-medium leading-tight"
                            >
                              {article.title}
                            </Typography>
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <Typography
                            variant="p"
                            color="muted"
                            className="text-xs sm:text-sm mb-3 line-clamp-2"
                          >
                            {article.description}
                          </Typography>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground font-bold">
                            <Clock className="h-3 w-3 " />
                            <span>{article.readTime}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="border-t pt-6 sm:pt-8 mt-8 sm:mt-12">
          <Card className="bg-muted/30">
            <CardContent className="p-4 sm:p-6 bg-white/75 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <Typography variant="h3" className="text-base sm:text-lg font-semibold mb-1">
                    {t('contactSupport.title')}
                  </Typography>
                  <Typography variant="p" color="muted" className="text-sm">
                    {t('contactSupport.description')}
                  </Typography>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                    <Link href="/contact">{t('contactSupport.buttons.contactSupport')}</Link>
                  </Button>
                  <Button size="sm" className="w-full sm:w-auto" asChild>
                    <Link href="mailto:support@lifo-app.com">{t('contactSupport.buttons.emailUs')}</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
