'use client'

import { ArrowRight, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { useStore } from '@/hooks/use-stores'
import { useStoreState } from '@/lib/stores/store-context'
import { setActiveStoreCookie } from '@/lib/actions/store-actions'

interface AddStoreSuccessProps {
  storeName: string
  storeId?: string
  onSuccess?: () => void
}

export function AddStoreSuccess({ storeName, storeId, onSuccess }: AddStoreSuccessProps) {
  const router = useRouter()
  const t = useTranslations('store.creation.success')
  const { setActiveStore } = useStoreState()
  const [isSwitching, setIsSwitching] = useState(false)

  // Fetch the full store details if we have a storeId
  const { data: newStore } = useStore(storeId || null)

  // Helper function to switch to the new store
  const switchToNewStore = async () => {
    if (!newStore || !storeId) {
      toast.error('Store information not available')
      return false
    }

    setIsSwitching(true)

    try {
      // Set active store directly (newStore is already of type Store)
      setActiveStore(newStore)

      // Also set the cookie for server-side consistency
      await setActiveStoreCookie(storeId)

      return true
    } catch (error) {
      console.error('Failed to set active store cookie:', error)
      toast.error('Failed to switch to new store')
      return false
    } finally {
      setIsSwitching(false)
    }
  }

  const handleGoToSettings = async () => {
    // Switch to new store before navigating
    const switched = await switchToNewStore()
    if (switched || !storeId) {
      router.push('/dashboard/settings?tab=store')
    }
  }

  const handleGoToDashboard = async () => {
    // Switch to new store before navigating
    const switched = await switchToNewStore()
    if (switched || !storeId) {
      // If onSuccess callback is provided (setup flow), call it instead of navigating
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard')
      }
    }
  }

  return (
    <div className="max-w-md mx-auto flex flex-col gap-6">
      <div className="text-center flex flex-col gap-4 flex flex-col items-center justify-center">
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
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs  text-primary">1</span>
              </div>
              <div className="flex flex-col gap-1 flex flex-col">
                <Typography variant="small">{t('whatsNext.steps.configure.title')}</Typography>
                <Typography variant="small" color="muted">
                  {t('whatsNext.steps.configure.description')}
                </Typography>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs  text-primary">2</span>
              </div>
              <div className="flex flex-col gap-1 flex flex-col">
                <Typography variant="small">{t('whatsNext.steps.inventory.title')}</Typography>
                <Typography variant="small" color="muted">
                  {t('whatsNext.steps.inventory.description')}
                </Typography>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs  text-primary">3</span>
              </div>
              <div className="flex flex-col gap-1 flex flex-col">
                <Typography variant="small">{t('whatsNext.steps.team.title')}</Typography>
                <Typography variant="small" color="muted">
                  {t('whatsNext.steps.team.description')}
                </Typography>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleGoToDashboard}
              disabled={isSwitching}
              className="w-full"
            >
              {isSwitching ? 'Switching...' : t('actions.goToDashboard')}
            </Button>
            <Button onClick={handleGoToSettings} disabled={isSwitching} className="w-full">
              {isSwitching ? 'Switching...' : t('actions.goToSettings')}
              {!isSwitching && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
