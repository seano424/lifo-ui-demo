'use client'

import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { ExternalLink, CheckCircle2, Settings } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AddStoreFlow } from '@/components/settings/add-store-flow'
import { useSquareStatus, useInitiateSquareConnect } from '@/hooks/use-square-integration'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function AddStoreStep() {
  const t = useTranslations('setupFlow')
  const router = useRouter()
  const [isAddStoreOpen, setIsAddStoreOpen] = useState(false)

  // Square integration hooks
  const { data: squareStatus } = useSquareStatus()
  const initiateSquareConnect = useInitiateSquareConnect()

  const isSquareConnected = squareStatus?.is_connected || false

  const handleSquareConnect = async () => {
    try {
      const response = await initiateSquareConnect.mutateAsync()
      // Redirect to Square OAuth URL
      if (response.authorization_url) {
        window.location.href = response.authorization_url
      } else {
        toast.error('Failed to get authorization URL')
      }
    } catch (error) {
      // Error is already handled by the hook's onError
      console.error('Square connection error:', error)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <Typography variant="h3">{t('steps.addStore.title')}</Typography>

        <Typography variant="p">{t('steps.addStore.description')}</Typography>

        <Card
          className={cn(
            'p-6 transition-colors cursor-pointer group',
            isSquareConnected ? 'shadow-primary-500 shadow-xl border-t-0' : '',
          )}
          onClick={() => {
            if (isSquareConnected) {
              router.push('/dashboard/integrations/square')
            } else {
              handleSquareConnect()
            }
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Image src="/square/square-icon.svg" alt="Square" width={40} height={40} />
              <div>
                <div className="flex items-center gap-2 pb-2">
                  <Typography variant="h3">Square</Typography>
                  {isSquareConnected ? (
                    <Badge variant="primary" className="gap-1">
                      <CheckCircle2 className="h-5 w-5 text-primary stroke-2" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      Not Connected
                    </Badge>
                  )}
                </div>
                <Typography variant="p">{t('steps.addStore.squareDescription')}</Typography>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-fit group-hover:bg-white group-hover:text-primary-800 hover:bg-white hover:text-primary-800 pointer-events-none"
            >
              {isSquareConnected ? (
                <>
                  <Settings className="h-4 w-4" />
                  Manage
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  {t('steps.addStore.connect')}
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      <BottomSheet
        isOpen={isAddStoreOpen}
        variant="fullHeight"
        onClose={() => setIsAddStoreOpen(false)}
      >
        <AddStoreFlow />
      </BottomSheet>
    </>
  )
}
