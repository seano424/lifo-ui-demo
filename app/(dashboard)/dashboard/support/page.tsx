'use client'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
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

const getSupportSections = (
  t: ReturnType<typeof useTranslations<'marketing'>>,
): SupportSection[] => [
  {
    id: 'getting-started',
    title: t('sections.gettingStarted.title'),
    description: t('sections.gettingStarted.description'),
    icon: Zap,
    articles: [
      {
        title: t('articles.quickStartGuide.title'),
        description: t('articles.quickStartGuide.description'),
        href: '/dashboard/support/quick-start-guide',
        readTime: t('articles.quickStartGuide.readTime'),
      },
      {
        title: t('articles.inventoryManagement.title'),
        description: t('articles.inventoryManagement.description'),
        href: '/dashboard/support/inventory-management',
        readTime: t('articles.inventoryManagement.readTime'),
      },
      {
        title: t('articles.scanInProcess.title'),
        description: t('articles.scanInProcess.description'),
        href: '/dashboard/support/scan-in',
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
        href: '/dashboard/support/multi-store',
        readTime: t('articles.multiStoreManagement.readTime'),
        comingSoon: true,
      },
      {
        title: t('articles.userRolesPermissions.title'),
        description: t('articles.userRolesPermissions.description'),
        href: '/dashboard/support/roles-permissions',
        readTime: t('articles.userRolesPermissions.readTime'),
        comingSoon: true,
      },
      {
        title: t('articles.scanOutProcess.title'),
        description: t('articles.scanOutProcess.description'),
        href: '/dashboard/support/scan-out',
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
    <div className="flex flex-col gap-12 w-full container md:py-6 lg:py-8">
      {/* Header */}
      <DashboardInsetHeader title={t('title')} description={t('subtitle')} />

      {/* Support Sections */}
      <div className="space-y-12">
        {sections.map(section => (
          <div key={section.id} className="flex flex-col gap-4">
            {/* Section Header */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <section.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex flex-col gap-1">
                <Typography variant="h2" className="text-xl font-semibold">
                  {section.title}
                </Typography>
                <Typography variant="p" color="muted" className="text-sm">
                  {section.description}
                </Typography>
              </div>
            </div>

            {/* Articles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.articles.map(article =>
                article.comingSoon ? (
                  <Card key={article.href} className="h-full opacity-60 cursor-not-allowed">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <Typography
                          variant="h3"
                          className="text-base  leading-tight text-muted-foreground"
                        >
                          {article.title}
                        </Typography>
                        <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs  rounded-md shrink-0">
                          {t('common.comingSoon')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Typography variant="p" color="muted" className="text-sm mb-3 line-clamp-2">
                        {article.description}
                      </Typography>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground ">
                        <Clock className="h-3 w-3" />
                        <span>{article.readTime}</span>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Link key={article.href} href={article.href}>
                    <Card className="h-full hover:shadow-md transition-shadow duration-200 cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <Typography variant="h3">{article.title}</Typography>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Typography variant="p" color="muted" className="text-sm mb-3 line-clamp-2">
                          {article.description}
                        </Typography>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground ">
                          <Clock className="h-3 w-3" />
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
      <div className="border-t pt-6 mt-8">
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col gap-2">
                <Typography variant="h3">{t('contactSupport.title')}</Typography>
                <Typography variant="p" color="muted">
                  {t('contactSupport.description')}
                </Typography>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                  <Link href="/contact">{t('contactSupport.buttons.contactSupport')}</Link>
                </Button>
                <Button size="sm" className="w-full sm:w-auto" asChild>
                  <Link href="mailto:support@lifo-app.com">
                    {t('contactSupport.buttons.emailUs')}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
