'use client'

import { useState } from 'react'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useSquareStatus, useInitiateSquareConnect } from '@/hooks/use-square-integration'
import { useStoreOverviews } from '@/hooks/use-store-overviews'
import type { StoreOverview } from '@/lib/queries/store-overview-rpc'
import { toast } from 'sonner'
import { useStoreState } from '@/lib/stores/store-context'
import { useSetupFlowStore } from '@/lib/stores/setup-flow-store'
import { Badge } from '@/components/ui/badge'
import { Package, FolderTree, ChevronDown, ChevronUp, ChevronRight, Info } from 'lucide-react'

interface StoreCardProps {
  store: StoreOverview
  isExpanded: boolean
  onToggle: () => void
  t: (key: string, params?: Record<string, number | string>) => string
}

function StoreCard({ store, isExpanded, t }: StoreCardProps) {
  // Get active store to determine if this is the current store
  const { activeStore } = useStoreState()
  const isCurrentStore = activeStore?.store_id === store.store_id

  return (
    <div>
      <div className="w-full p-4 gap-4 items-center text-left">
        {/* Left side - Store info */}
        <Typography variant="p">{store.store_name}</Typography>

        {/* Middle - Stats (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-4 md:col-span-5">
          <Typography variant="p" className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="w-4 h-4" />
            {store.product_count} {t('steps.addStore.products').toLowerCase()}
          </Typography>
          <Typography variant="p" className="flex items-center gap-1.5 text-muted-foreground">
            <FolderTree className="w-4 h-4" />
            {store.category_count} {t('steps.addStore.categories').toLowerCase()}
          </Typography>
        </div>

        {/* Right side - Active Store badge and Expand indicator */}
        <div className="hidden md:flex items-center justify-end gap-2 md:col-span-2">
          {isCurrentStore && <Badge variant="primary">{t('steps.addStore.activeStore')}</Badge>}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
          )}
        </div>
      </div>
    </div>
  )
}

export function AddStoreStep() {
  const t = useTranslations('setupFlow')
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null)

  // Square integration hooks
  const { data: squareStatus, isLoading: isLoadingStatus } = useSquareStatus()
  const initiateSquareConnect = useInitiateSquareConnect()

  // Store overviews hook
  const { data: stores } = useStoreOverviews()

  // Filter to only show Square stores
  const squareStores = stores?.filter(store => store.is_square_store) ?? []

  // Setup flow navigation
  const { goToNextStep } = useSetupFlowStore()

  // Wait for status to load before deciding which view to show.
  // Without this guard, squareStatus is undefined during (re)fetch and
  // isSquareConnected defaults to false, causing a flash of the "connect" UI
  // even for users who are already connected.
  if (isLoadingStatus) {
    return null
  }

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

  const handleContinueToBatchTracking = () => {
    goToNextStep()
  }

  const toggleStore = (storeId: string) => {
    setExpandedStoreId(expandedStoreId === storeId ? null : storeId)
  }

  // Show disconnected state if not connected
  if (!isSquareConnected) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 p-4 text-center">
          <Typography variant="h2" className="font-extrabold">
            {t('steps.addStore.title')}
          </Typography>

          <Typography variant="p" color="muted" className="max-w-lg mx-auto">
            {t('steps.addStore.description')}
          </Typography>
        </div>

        {/* Main bordered container */}
        <div className="flex flex-col rounded-xl overflow-hidden max-w-2xl mx-auto">
          <button
            type="button"
            onClick={handleSquareConnect}
            className="p-4 hover:bg-muted transition-colors cursor-pointer grid grid-cols-1 gap-4 items-center text-left w-full group"
          >
            <div className="flex gap-4">
              <div className="size-10 bg-secondary-100 rounded-lg flex items-center justify-center">
                <Image src="/square/square-icon.svg" alt="Square" width={20} height={20} />
              </div>
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col gap-1">
                  <Typography variant="p">Square</Typography>
                  <Typography variant="p" color="muted">
                    {t('steps.addStore.squareDescription')}
                  </Typography>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 group-hover:text-foreground" />
              </div>
            </div>
            {/* <div className="flex items-center gap-5 justify-end">
                <Typography variant="p">{t('steps.addStore.connect')}</Typography>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div> */}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 p-4 text-center">
        <Typography variant="h2" className="font-extrabold">
          {t('steps.addStore.titleConnected')}
        </Typography>

        <Typography variant="p" color="muted" className="max-w-lg mx-auto">
          {t('steps.addStore.descriptionConnected')}
        </Typography>
      </div>

      {/* Main bordered container - matching integrations page style */}
      <div className="flex flex-col gap-4 items-center text-center rounded-xl overflow-hidden">
        {/* Header section */}
        {/* NOTE: Sync button temporarily hidden until backend UPSERT fix is deployed */}
        <div className="flex flex-col gap-1">
          <Typography variant="h5">{t('steps.addStore.yourStores')}</Typography>
          <Typography variant="small">
            {t('steps.addStore.storesConnected', { count: squareStores.length })}
          </Typography>
        </div>

        {/* Store list - bordered sections */}
        <div className="flex gap-2 items-center flex-wrap divide-x divide-border">
          {squareStores.map(store => (
            <StoreCard
              key={store.store_id}
              store={store}
              isExpanded={expandedStoreId === store.store_id}
              onToggle={() => toggleStore(store.store_id)}
              t={t}
            />
          ))}
        </div>

        {/* Help footer */}
        <div className="border border-border rounded-xl overflow-hidden max-w-2xl mx-auto p-4 grid grid-cols-1 gap-4 items-center text-left w-full group">
          <div className="flex gap-4">
            <div className="size-10 bg-secondary-100 rounded-lg flex items-center justify-center">
              <Info className="size-5 text-primary-600 stroke-3" />
            </div>
            <div className="flex items-center justify-between w-full">
              <Typography variant="small" color="muted">
                {t('steps.addStore.helpNote')}
              </Typography>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleContinueToBatchTracking} className="w-full sm:w-fit">
          {t('steps.addStore.importSummary.continueButton')}
        </Button>
      </div>
    </div>
  )
}
