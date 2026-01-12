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
import { useInitiateSquareConnect } from '@/hooks/use-square-integration'

export default function SquareConnectPage() {
  const router = useRouter()
  const t = useTranslations('integrations.square')
  const initiateMutation = useInitiateSquareConnect()

  const handleConnect = async () => {
    try {
      const result = await initiateMutation.mutateAsync()

      // Redirect to Square OAuth page
      window.location.href = result.authorization_url
    } catch (error) {
      // Error is handled by mutation hook (toast notification)
      console.error('Square connect initiation failed:', error)
    }
  }

  return (
    <div className="container max-w-4xl space-y-6 py-6 lg:py-8">
      {/* Header */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/integrations')}
          className="mb-4"
        >
          <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
          {t('backToIntegrations')}
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black">
            <Square className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('connectTitle')}</h1>
            <p className="text-gray-600">{t('connectSubtitle')}</p>
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
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
              <div>
                <p className="font-medium">{t('benefit1Title')}</p>
                <p className="text-sm text-gray-600">{t('benefit1Description')}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
              <div>
                <p className="font-medium">{t('benefit2Title')}</p>
                <p className="text-sm text-gray-600">{t('benefit2Description')}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
              <div>
                <p className="font-medium">{t('benefit3Title')}</p>
                <p className="text-sm text-gray-600">{t('benefit3Description')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              {t('security')}
            </CardTitle>
            <CardDescription>{t('securityDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <p>{t('securityPoint1')}</p>
            <p>{t('securityPoint2')}</p>
            <p>{t('securityPoint3')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Connection Button */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('readyToConnect')}</h3>
              <p className="text-sm text-gray-600">{t('connectDescription')}</p>
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

            <Alert>
              <AlertDescription className="text-sm text-gray-600">
                {t('redirectNotice')}
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
