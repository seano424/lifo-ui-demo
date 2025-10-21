import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Check, Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Suspense } from 'react'

function SuccessContent() {
  const t = useTranslations('onboarding.success')

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md mx-auto space-y-6">
        {/* Success Icon */}
        <div className="text-center flex flex-col items-center gap-2">
          <Check className="w-10 h-10 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
          <Typography variant="h1">{t('accountCreated')}</Typography>
        </div>

        <Card shadow="primary" className="flex flex-col gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {t('checkEmail')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Typography variant="p" color="muted">
              {t('emailSent')}
            </Typography>

            <div>
              <Typography variant="p">
                <strong>{t('whatsNext')}</strong>
              </Typography>
              <ul className="mt-2 space-y-1">
                <li>1. {t('steps.checkEmail')}</li>
                <li>2. {t('steps.clickLink')}</li>
                <li>3. {t('steps.redirected')}</li>
                <li>4. {t('steps.signIn')}</li>
              </ul>
            </div>

            <Typography>
              {t('noEmail')}{' '}
              <a
                href="mailto:support@lifo-app?subject=Email Verification Issue"
                className="text-primary hover:underline"
              >
                {t('contactSupport')}
              </a>
              .
            </Typography>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function OnboardingSuccessPage() {
  const t = useTranslations('onboarding.success')

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <Typography variant="p" color="muted">
              {t('loading')}
            </Typography>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
