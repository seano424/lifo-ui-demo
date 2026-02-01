/**
 * Square Connect Page
 * Initiates Square OAuth connection flow
 */

'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Square, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useInitiateSquareConnect } from '@/hooks/use-square-integration'
import { Typography } from '@/components/ui/typography'
import Image from 'next/image'

export default function SquareConnectPage() {
  const router = useRouter()
  const t = useTranslations('integrations.square')
  const initiateMutation = useInitiateSquareConnect()

  const handleConnect = async () => {
    try {
      const result = await initiateMutation.mutateAsync()

      // Redirect to Square OAuth page
      window.location.href = result.authorization_url
    } catch (error: unknown) {
      // Error is handled by mutation hook (toast notification)
      console.error('Square connect initiation failed:', error)
    }
  }

  return (
    <ErrorBoundary>
      <div className="container max-w-4xl flex flex-col gap-6 py-6 lg:py-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/integrations')}
            className="mb-4 w-fit"
          >
            <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
            {t('backToIntegrations')}
          </Button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
              <Image src="/square/square-icon.svg" alt="Square" width={20} height={20} />
            </div>
            <div>
              <Typography variant="h3">{t('connectTitle')}</Typography>
              <Typography variant="p" color="muted">
                {t('connectSubtitle')}
              </Typography>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Benefits Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('whatYouGet')}</CardTitle>
              <CardDescription>{t('whatYouGetDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <Typography variant="p">{t('benefit1Title')}</Typography>
                  <Typography variant="p" color="muted">
                    {t('benefit1Description')}
                  </Typography>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <Typography variant="p">{t('benefit2Title')}</Typography>
                  <Typography variant="p" color="muted">
                    {t('benefit2Description')}
                  </Typography>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <Typography variant="p">{t('benefit3Title')}</Typography>
                  <Typography variant="p" color="muted">
                    {t('benefit3Description')}
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {t('security')}
              </CardTitle>
              <CardDescription>{t('securityDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-foreground">
              <Typography variant="p">{t('securityPoint1')}</Typography>
              <Typography variant="p">{t('securityPoint2')}</Typography>
              <Typography variant="p">{t('securityPoint3')}</Typography>
            </CardContent>
          </Card>
        </div>

        {/* Connection Button */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center flex flex-col gap-4 text-center">
              <div className="flex flex-col gap-2">
                <Typography variant="h3">{t('readyToConnect')}</Typography>
                <Typography variant="p" color="muted">
                  {t('connectDescription')}
                </Typography>
              </div>

              <Button
                onClick={handleConnect}
                loading={initiateMutation.isPending}
                loadingText={t('connecting')}
                size="lg"
                className="w-full max-w-sm"
              >
                <Square className="mr-2 h-5 w-5" />
                {t('connect')}
              </Button>

              <Alert className="w-max">
                <AlertDescription>{t('redirectNotice')}</AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}
