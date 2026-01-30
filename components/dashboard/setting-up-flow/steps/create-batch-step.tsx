'use client'

import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { PackagePlus } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function CreateBatchStep() {
  const t = useTranslations('setupFlow')

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="h3">{t('steps.createBatch.title')}</Typography>

      <Typography variant="p">{t('steps.createBatch.description')}</Typography>

      <Card className="p-8 flex flex-col items-center gap-6 text-center">
        <div className="p-4 bg-primary/10 rounded-full">
          <PackagePlus className="h-12 w-12 text-primary" />
        </div>

        <div className="flex flex-col gap-2">
          <Typography variant="h3">{t('steps.createBatch.placeholder')}</Typography>
          <Typography variant="p" className="max-w-md">
            {t('steps.createBatch.placeholderDescription')}
          </Typography>
        </div>

        <Button disabled className="mt-4">
          {t('steps.createBatch.createButton')}
        </Button>
      </Card>
    </div>
  )
}
