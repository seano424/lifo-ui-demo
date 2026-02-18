/**
 * Square Callback Processor Component
 * Handles OAuth callback flow with polling and state management
 * Includes post-connection sync progress tracking
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle2, XCircle, Loader2, AlertCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useSquareStatusPolling } from '@/hooks/use-square-integration'
import type { ConnectedStoreInfo } from '@/lib/types/integrations'

type CallbackStatus = 'processing' | 'syncing' | 'success' | 'error' | 'sync_failed'

const MAX_POLLING_TIME_MS = 120000 // 120 seconds max polling time (large catalogs may take time)

export function SquareCallbackProcessor() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('integrations.square.callback')

  const [status, setStatus] = useState<CallbackStatus>('processing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [pollingStartTime] = useState<number>(Date.now())
  const [shouldPoll, setShouldPoll] = useState<boolean>(true)

  // Check for error in URL params (user denied authorization or other OAuth errors)
  const urlError = searchParams?.get('error')
  const urlErrorMessage = searchParams?.get('error_message')

  // Poll Square status to check connection completion
  // Keep polling during processing and syncing states
  const isPolling = (status === 'processing' || status === 'syncing') && shouldPoll
  const {
    data: squareStatus,
    isError,
    error,
  } = useSquareStatusPolling(isPolling)

  useEffect(() => {
    // Check for URL error first (user denied authorization)
    if (urlError) {
      setStatus('error')
      setErrorMessage(
        urlErrorMessage || 'Authorization was cancelled. Please try again to connect Square.',
      )
      return
    }

    // Check polling result
    if ((status === 'processing' || status === 'syncing') && squareStatus) {
      if (squareStatus.is_connected) {
        const syncStatus = squareStatus.initial_sync_status

        if (syncStatus === 'syncing' || syncStatus === 'pending') {
          // Connection established, sync in progress
          setStatus('syncing')
        } else if (syncStatus === 'completed') {
          // Sync completed successfully
          setStatus('success')
          setTimeout(() => {
            router.push('/dashboard/integrations/square')
          }, 2000)
        } else if (syncStatus === 'failed') {
          // Sync failed but connection is active — user can retry from dashboard
          setStatus('sync_failed')
          setTimeout(() => {
            router.push('/dashboard/integrations/square')
          }, 3000)
        } else {
          // No sync status yet (legacy or sync hasn't started) — treat as success
          setStatus('success')
          setTimeout(() => {
            router.push('/dashboard/integrations/square')
          }, 2000)
        }
      } else {
        // Not connected yet — check timeout
        const elapsedTime = Date.now() - pollingStartTime
        if (elapsedTime >= MAX_POLLING_TIME_MS) {
          setShouldPoll(false)
          setStatus('error')
          setErrorMessage(
            'Connection verification timed out. Please try again or contact support if the issue persists.',
          )
        }
      }
    }

    // Handle polling error
    if (isError && (status === 'processing' || status === 'syncing')) {
      setShouldPoll(false)
      setStatus('error')
      setErrorMessage(
        error?.message ||
          'Failed to verify connection. Please try again or contact support if the issue persists.',
      )
    }
  }, [squareStatus, isError, error, status, pollingStartTime, router, urlError, urlErrorMessage])

  const isLoading = status === 'processing' || status === 'syncing'
  const isSuccess = status === 'success'
  const isErrorState = status === 'error'
  const isSyncFailed = status === 'sync_failed'

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center">
            {isLoading && (
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <Loader2 className="h-8 w-8 animate-spin text-primary-800" />
              </div>
            )}
            {isSuccess && (
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
            )}
            {isSyncFailed && (
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            )}
            {isErrorState && (
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            )}
          </div>

          <CardTitle className="text-center">
            {status === 'processing' && t('processing')}
            {status === 'syncing' && t('success')}
            {status === 'success' && t('success')}
            {status === 'sync_failed' && t('syncWarningTitle')}
            {status === 'error' && t('error')}
          </CardTitle>

          <CardDescription className="text-center">
            {status === 'processing' && t('processingDescription')}
            {status === 'syncing' && t('syncingCatalog')}
            {status === 'success' && t('syncCompleted')}
            {status === 'sync_failed' && t('syncFailed')}
            {status === 'error' && t('errorDescription')}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {status === 'processing' && (
            <div className="flex flex-col gap-2 text-sm text-foreground">
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

          {status === 'syncing' && (
            <div className="flex flex-col gap-2 text-sm text-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{t('verifyingAuthorization')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{t('fetchingBusinessInfo')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{t('creatingStore')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary-600" />
                <span>{t('syncingCatalog')}</span>
              </div>
            </div>
          )}

          {isSuccess && squareStatus && (
            <div className="flex flex-col gap-3 rounded-lg bg-primary-50 p-4 text-sm">
              {squareStatus.merchant_name && (
                <div className="flex justify-between">
                  <span className="text-foreground">{t('merchant')}:</span>
                  <span className=" text-foreground">{squareStatus.merchant_name}</span>
                </div>
              )}
              {squareStatus.stores && squareStatus.stores.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-foreground">
                    {squareStatus.stores.length === 1
                      ? t('connectedStore')
                      : t('connectedStores', {
                          count: squareStatus.stores.length,
                        })}
                    :
                  </span>
                  <ul className="ml-4 flex flex-col gap-1">
                    {squareStatus.stores.map((store: ConnectedStoreInfo) => (
                      <li key={store.store_id} className=" text-foreground">
                        {store.store_name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {isSyncFailed && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('syncWarningTitle')}</AlertTitle>
              <AlertDescription>{t('syncFailed')}</AlertDescription>
            </Alert>
          )}

          {isErrorState && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('errorTitle')}</AlertTitle>
                <AlertDescription>
                  {errorMessage}
                  {/* TEMPORARY DEBUG - Show status response if available */}
                  {squareStatus && process.env.NODE_ENV === 'development' && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer">Debug Info</summary>
                      <pre className="mt-1 overflow-auto">
                        {JSON.stringify(squareStatus, null, 2)}
                      </pre>
                    </details>
                  )}
                </AlertDescription>
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
