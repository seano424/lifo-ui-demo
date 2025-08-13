'use client'

import { ArrowRight, Plus, ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

import { Card, CardContent } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

export function AddProductsCard() {
  const t = useTranslations('dashboard.quickActions')

  return (
    <Link href="/dashboard/inbound" className="block h-full">
      <Card className="border-l-4 border-l-blue-500 border-t-0 border-r-0 border-b-0 shadow-sm hover:shadow-md transition-all hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent dark:hover:from-blue-900/10 dark:hover:to-transparent h-full rounded-md overflow-hidden group">
        <CardContent className="p-3 py-2.5 flex items-center gap-3">
          <div className="p-1.5 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-md flex-shrink-0 text-white shadow-sm">
            <Plus className="h-3.5 w-3.5" />
          </div>

          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <Typography
                variant="h4"
                className="font-semibold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 inline-block text-transparent bg-clip-text"
              >
                {t('addProducts.title')}
              </Typography>
              <ShoppingBag className="h-4 w-4 text-blue-500/70 dark:text-blue-400/70" />
            </div>
            <Typography variant="p" className="text-xs text-muted-foreground line-clamp-1">
              {t('addProducts.description')}
            </Typography>
          </div>

          <ArrowRight className="h-4 w-4 text-blue-500 transform transition-transform group-hover:translate-x-1" />
        </CardContent>
      </Card>
    </Link>
  )
}
