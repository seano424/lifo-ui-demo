'use client'

import { ArrowRight, PackageOpen, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

import { Card, CardContent } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

export function RemoveProductsCard() {
  const t = useTranslations('dashboard.quickActions')

  return (
    <Link href="/dashboard/outbound" className="block h-full">
      <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:bg-destructive/5 h-full rounded-md overflow-hidden group">
        <CardContent className="border-l-4 border-l-destructive p-3 py-3 flex flex-col">
          <div className="flex items-start gap-3 mb-1.5">
            <div className="p-1.5 bg-destructive rounded-md flex-shrink-0 text-destructive-foreground shadow-sm">
              <Trash2 className="h-3.5 w-3.5" />
            </div>

            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <Typography variant="h4" className="font-semibold text-sm text-destructive">
                  {t('removeProducts.title')}
                </Typography>
                <PackageOpen className="h-4 w-4 text-destructive/70" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Typography variant="p" className="text-xs text-muted-foreground pl-8 pr-5">
              {t('removeProducts.description')}
            </Typography>
            <ArrowRight className="h-4 w-4 text-destructive transform transition-transform group-hover:translate-x-1 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
