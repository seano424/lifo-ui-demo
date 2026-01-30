'use client'

import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function CreateAccountStep() {
  const t = useTranslations('setupFlow')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-8 w-8 text-primary" />
        <Typography variant="h2" className="font-bold">
          {t('steps.createAccount.title')}
        </Typography>
      </div>

      <Card className="p-8 bg-primary-50/50 dark:bg-primary-950/10 border-primary-200 dark:border-primary-900">
        <div className="flex flex-col gap-4 text-center">
          <Typography variant="p" className="text-lg text-muted-foreground">
            {t('steps.createAccount.success')}
          </Typography>
        </div>
      </Card>
    </div>
  )
}
