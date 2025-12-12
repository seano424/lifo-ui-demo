'use client'

import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function SetupNotificationsStep() {
  const t = useTranslations('setupFlow')

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="h2" className="font-bold">
        {t('steps.notifications.title')}
      </Typography>

      <Typography variant="p" className="text-muted-foreground">
        {t('steps.notifications.description')}
      </Typography>

      <Card className="p-8 flex flex-col items-center gap-6 text-center">
        <div className="p-4 bg-primary/10 rounded-full">
          <Bell className="h-12 w-12 text-primary" />
        </div>

        <div className="flex flex-col gap-2">
          <Typography variant="h3" className="font-semibold">
            {t('steps.notifications.placeholder')}
          </Typography>
          <Typography variant="p" className="text-sm text-muted-foreground max-w-md">
            {t('steps.notifications.placeholderDescription')}
          </Typography>
        </div>

        <Button disabled className="mt-4">
          {t('steps.notifications.setupButton')}
        </Button>
      </Card>
    </div>
  )
}
