'use client'

import { ArrowRight, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

interface AddStoreSuccessProps {
  storeName: string
}

export function AddStoreSuccess({ storeName }: AddStoreSuccessProps) {
  const router = useRouter()
  const t = useTranslations('store.creation.success')

  const handleGoToSettings = () => {
    router.push('/dashboard/settings?tab=store')
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-4 flex flex-col items-center justify-center">
        <Check className="w-10 h-10 stroke-2 rounded-full p-2 bg-primary-900 text-white" />
        <Typography variant="h1">{t('title')}</Typography>
        <Typography variant="p" color="muted">
          {t('description', { storeName })}
        </Typography>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">{t('whatsNext.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">1</span>
              </div>
              <div className="space-y-1 flex flex-col">
                <Typography variant="small" className="font-medium">
                  {t('whatsNext.steps.configure.title')}
                </Typography>
                <Typography variant="small" color="muted">
                  {t('whatsNext.steps.configure.description')}
                </Typography>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">2</span>
              </div>
              <div className="space-y-1 flex flex-col">
                <Typography variant="small" className="font-medium">
                  {t('whatsNext.steps.inventory.title')}
                </Typography>
                <Typography variant="small" color="muted">
                  {t('whatsNext.steps.inventory.description')}
                </Typography>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">3</span>
              </div>
              <div className="space-y-1 flex flex-col">
                <Typography variant="small" className="font-medium">
                  {t('whatsNext.steps.team.title')}
                </Typography>
                <Typography variant="small" color="muted">
                  {t('whatsNext.steps.team.description')}
                </Typography>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleGoToDashboard} className="w-full">
              {t('actions.goToDashboard')}
            </Button>
            <Button onClick={handleGoToSettings} className="w-full">
              {t('actions.goToSettings')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
