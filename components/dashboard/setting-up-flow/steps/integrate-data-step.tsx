'use client'

import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

export function IntegrateDataStep() {
  const t = useTranslations('setupFlow')

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="h2" className="font-bold">
        {t('steps.addStore.title')}
      </Typography>

      <Typography variant="p" className="text-muted-foreground">
        {t('steps.addStore.description')}
      </Typography>

      {/* Real-time integrations */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Typography variant="h3" className="font-semibold">
            {t('steps.addStore.realTime')}
          </Typography>
          <Badge className="font-bold font-heading" variant="invertedSecondary">
            {t('steps.addStore.recommended')}
          </Badge>
        </div>

        <Card className="p-6 transition-colors cursor-pointer group">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Image src="/square/square-icon.svg" alt="Square" width={40} height={40} />
              <div>
                <Typography variant="h4" className="font-semibold">
                  Square
                </Typography>
                <Typography variant="p" className="text-sm text-muted-foreground">
                  {t('steps.addStore.squareDescription')}
                </Typography>
              </div>
            </div>
            <Button
              variant="outline"
              // disabled
              className="w-fit group-hover:bg-white group-hover:text-primary-800 hover:bg-white hover:text-primary-800"
            >
              <ExternalLink className="h-4 w-4" />
              {t('steps.addStore.connect')}
            </Button>
          </div>
        </Card>
      </div>

      {/* One-time import */}
      <div className="flex flex-col gap-4 mt-4">
        <Typography variant="h3" className="font-semibold">
          {t('steps.addStore.oneTime')}
        </Typography>

        <Card className="p-6 border-dashed">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <FileUp className="h-5 w-5 text-muted-foreground" />
              <Typography variant="h4" className="">
                CSV
              </Typography>
            </div>
            <Typography variant="p" className="text-sm text-muted-foreground">
              {t('steps.addStore.csvDescription')}
            </Typography>
            <Button
              variant="outline"
              // disabled
              className="w-fit hover:bg-white hover:text-primary-800"
            >
              {t('steps.addStore.importCSV')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
