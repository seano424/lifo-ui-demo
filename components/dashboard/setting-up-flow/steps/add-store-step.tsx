'use client'

import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useSquareStatus, useInitiateSquareConnect } from '@/hooks/use-square-integration'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useCategoriesWithTrackingSettings } from '@/lib/queries/batch-tracking-onboarding'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { useSetupFlowStore } from '@/lib/stores/setup-flow-store'
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react'

export function AddStoreStep() {
  const t = useTranslations('setupFlow')

  // Square integration hooks
  const { data: squareStatus } = useSquareStatus()
  const initiateSquareConnect = useInitiateSquareConnect()

  // Get store ID and catalog data
  const storeId = useActiveStoreId()
  const { data: categories, isLoading: isSyncing } = useCategoriesWithTrackingSettings(
    storeId || '',
  )

  // Setup flow navigation
  const { goToNextStep } = useSetupFlowStore()

  const isSquareConnected = squareStatus?.is_connected || false

  // Calculate catalog stats
  const categoryCount = categories?.length || 0
  const productCount = categories?.reduce((sum, cat) => sum + cat.product_count, 0) || 0

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

  const handleContinueToBatchTracking = () => {
    goToNextStep()
  }

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="h3">
        {isSquareConnected ? t('steps.addStore.titleConnected') : t('steps.addStore.title')}
      </Typography>

      <Typography variant="p">
        {isSquareConnected
          ? t('steps.addStore.descriptionConnected')
          : t('steps.addStore.description')}
      </Typography>

      <Card
        className={cn(
          'p-6 transition-colors',
          isSquareConnected ? 'shadow-primary-500 shadow-xl border-t-0' : 'cursor-pointer group',
        )}
        onClick={() => {
          if (!isSquareConnected) {
            handleSquareConnect()
          }
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div className="hidden dark:block">
              <Image
                src="/square/White/Square_Logo_2025_White.svg"
                alt="Square"
                width={150}
                height={150}
              />
            </div>
            <div className="block dark:hidden">
              <Image
                src="/square/Black/Square_Logo_2025_Black.svg"
                alt="Square"
                width={150}
                height={150}
              />
            </div>

            {!isSquareConnected && (
              <Typography variant="h4">{t('steps.addStore.squareDescription')}</Typography>
            )}
          </div>

          {/* Catalog Stats (shown when connected) */}
          {isSquareConnected &&
            (isSyncing ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center border-t">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <Typography variant="small" className="text-muted-foreground">
                  Syncing your catalog...
                </Typography>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Typography variant="h4" className="font-semibold">
                      {productCount.toLocaleString()}
                    </Typography>
                    <Typography variant="small" className="text-muted-foreground">
                      Products
                    </Typography>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Typography variant="h4" className="font-semibold">
                      {categoryCount.toLocaleString()}
                    </Typography>
                    <Typography variant="small" className="text-muted-foreground">
                      Categories
                    </Typography>
                  </div>
                </div>

                <Button onClick={handleContinueToBatchTracking} size="lg" className="w-full mt-2">
                  Continue to Batch Tracking Setup
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            ))}
        </div>
      </Card>
    </div>
  )
}
