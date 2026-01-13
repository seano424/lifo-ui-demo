/**
 * Square Callback Processor Component
 * Handles OAuth callback flow with polling and state management
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useSquareStatusPolling } from '@/hooks/use-square-integration'

type CallbackStatus = 'processing' | 'success' | 'error'

const MAX_POLLING_TIME_MS = 60000 // 60 seconds max polling time

export function SquareCallbackProcessor() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('integrations.square.callback')

  const [status, setStatus] = useState<CallbackStatus>('processing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [pollingStartTime] = useState<number>(Date.now())

  // Check for error in URL params (user denied authorization)
  const urlError = searchParams?.get('error')
  const urlErrorDescription = searchParams?.get('error_description')

  // Poll Square status to check connection completion
  const { data: squareStatus, isError, error } = useSquareStatusPolling(status === 'processing')

  useEffect(() => {
    // Check for URL error first (user denied authorization)
    if (urlError) {
      setStatus('error')
      setErrorMessage(
        urlErrorDescription || 'Authorization was cancelled. Please try again to connect Square.',
      )
      return
    }

    // Check polling result
    if (status === 'processing' && squareStatus) {
      if (squareStatus.is_connected) {
        // Success! Connection established
        setStatus('success')

        // Redirect to Square management page after 2 seconds
        setTimeout(() => {
          router.push('/dashboard/integrations/square')
        }, 2000)
      } else {
        // Check if we've exceeded max polling time using timestamp
        const elapsedTime = Date.now() - pollingStartTime
        if (elapsedTime >= MAX_POLLING_TIME_MS) {
          setStatus('error')
          setErrorMessage(
            'Connection verification timed out. Please try again or contact support if the issue persists.',
          )
        }
      }
    }

    // Handle polling error
    if (isError && status === 'processing') {
      setStatus('error')
      setErrorMessage(
        error?.message ||
          'Failed to verify connection. Please try again or contact support if the issue persists.',
      )
    }
  }, [
    squareStatus,
    isError,
    error,
    status,
    pollingStartTime,
    router,
    urlError,
    urlErrorDescription,
  ])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center">
            {status === 'processing' && (
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <Loader2 className="h-8 w-8 animate-spin text-primary-900" />
              </div>
            )}
            {status === 'success' && (
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            )}
          </div>

          <CardTitle className="text-center">
            {status === 'processing' && t('processing')}
            {status === 'success' && t('success')}
            {status === 'error' && t('error')}
          </CardTitle>

          <CardDescription className="text-center">
            {status === 'processing' && t('processingDescription')}
            {status === 'success' && t('successDescription')}
            {status === 'error' && t('errorDescription')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'processing' && (
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary-600" />
                <span>{t('verifyingAuthorization')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary-600 animation-delay-200" />
                <span>{t('fetchingBusinessInfo')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary-600 animation-delay-400" />
                <span>{t('creatingStore')}</span>
              </div>
            </div>
          )}

          {status === 'success' && squareStatus && (
            <div className="space-y-3 rounded-lg bg-green-50 p-4 text-sm">
              {squareStatus.merchant_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('merchant')}:</span>
                  <span className="font-medium text-gray-900">{squareStatus.merchant_name}</span>
                </div>
              )}
              {squareStatus.stores && squareStatus.stores.length > 0 && (
                <div className="space-y-2">
                  <span className="text-gray-600">
                    {squareStatus.stores.length === 1
                      ? t('connectedStore')
                      : t('connectedStores', { count: squareStatus.stores.length })}
                    :
                  </span>
                  <ul className="ml-4 space-y-1">
                    {squareStatus.stores.map(store => (
                      <li key={store.store_id} className="font-medium text-gray-900">
                        {store.store_name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('errorTitle')}</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  onClick={() => router.push('/dashboard/integrations/square/connect')}
                  variant="default"
                  className="flex-1"
                >
                  {t('tryAgain')}
                </Button>
                <Button
                  onClick={() => router.push('/dashboard/integrations')}
                  variant="outline"
                  className="flex-1"
                >
                  {t('goBack')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
