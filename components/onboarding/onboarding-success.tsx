'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { ArrowRight, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

interface OnboardingSuccessProps {
  storeName: string
}

export function OnboardingSuccess({ storeName }: OnboardingSuccessProps) {
  const router = useRouter()
  const t = useTranslations('onboarding.success')

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
        <Typography variant="h1">{t('welcome')}</Typography>
        <Typography variant="p" color="muted">
          {t('storeSetup', { storeName })}
        </Typography>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">{t('whatsNextTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs  text-primary">1</span>
              </div>
              <div className="space-y-1 flex flex-col">
                <Typography variant="small" className="">
                  {t('nextSteps.completeSetup.title')}
                </Typography>
                <Typography variant="small" color="muted">
                  {t('nextSteps.completeSetup.description')}
                </Typography>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs  text-primary">2</span>
              </div>
              <div className="space-y-1 flex flex-col">
                <Typography variant="small" className="">
                  {t('nextSteps.addProducts.title')}
                </Typography>
                <Typography variant="small" color="muted">
                  {t('nextSteps.addProducts.description')}
                </Typography>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs  text-primary">3</span>
              </div>
              <div className="space-y-1 flex flex-col">
                <Typography variant="small" className="">
                  {t('nextSteps.inviteTeam.title')}
                </Typography>
                <Typography variant="small" color="muted">
                  {t('nextSteps.inviteTeam.description')}
                </Typography>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleGoToDashboard} className="w-full">
              {t('actions.goToDashboard')}
            </Button>
            <Button onClick={handleGoToSettings} className="w-full">
              {t('actions.completeSetup')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
