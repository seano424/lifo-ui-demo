'use client'

import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Badge } from '@/components/ui/badge'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
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
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="bg-white dark:bg-linear-to-br from-primary-900 rounded-lg p-1.5 h-fit mt-2">
                <Image src="/square/square-icon.svg" alt="Square" width={32} height={32} />
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="h3">Square</Typography>
                <Typography variant="p">{t('steps.addStore.squareDescription')}</Typography>
              </div>
            </div>
          </div>
          <div className="mt-4">
            {isSquareConnected ? (
              <Badge variant="ghost" className="gap-1 w-full">
                Connected
              </Badge>
            ) : (
              <Badge variant="ghost" className="gap-1 w-full">
                Not Connected
              </Badge>
            )}
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
