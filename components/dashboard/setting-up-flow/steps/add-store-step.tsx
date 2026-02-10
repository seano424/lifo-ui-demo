'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import {
  useSquareStatus,
  useInitiateSquareConnect,
  useSyncSquareCatalog,
  useSyncSquareInventory,
} from '@/hooks/use-square-integration'
import { useStoreOverviews } from '@/hooks/use-store-overviews'
import type { StoreOverview } from '@/lib/queries/store-overview-rpc'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useCategoriesWithTrackingSettings } from '@/lib/queries/batch-tracking-onboarding'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { useSetupFlowStore } from '@/lib/stores/setup-flow-store'
import {
  Loader2,
  ArrowRight,
  Store,
  Package,
  FolderTree,
  RefreshCw,
  ExternalLink,
  Unlink,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react'

// ─── Helper Components ────────────────────────────────────

type SyncHealth = 'healthy' | 'empty' | 'stale' | 'error'

interface StatusDotProps {
  health: SyncHealth
}

function StatusDot({ health }: StatusDotProps) {
  const styles: Record<SyncHealth, string> = {
    healthy: 'bg-gray-900 dark:bg-gray-100',
    empty: 'bg-gray-400',
    stale: 'bg-gray-500',
    error: 'bg-gray-300 ring-2 ring-gray-400',
  }

  return <span className={cn('inline-block w-2 h-2 rounded-full', styles[health])} />
}

interface StoreCardProps {
  store: StoreOverview
  isExpanded: boolean
  onToggle: () => void
  onSyncNow: () => void
  isSyncing: boolean
  t: (key: string) => string
}

function StoreCard({ store, isExpanded, onToggle, onSyncNow, isSyncing, t }: StoreCardProps) {
  // Derive sync health from store data
  const syncHealth: SyncHealth =
    store.product_count === 0 && store.category_count === 0 ? 'empty' : 'healthy'

  // Format last sync time
  const lastSync = formatRelativeTime(store.updated_at)

  // Truncate store ID for display (show first 4 and last 4 chars)
  const displayStoreId = store.store_code
    ? `${store.store_code.slice(0, 4)}...${store.store_code.slice(-4)}`
    : store.store_id.slice(0, 8)

  return (
    <Card className="overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      {/* Store header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center">
            <Store className="w-4.5 h-4.5 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{store.store_name}</span>
              <StatusDot health={syncHealth} />
            </div>
            <span className="text-xs text-muted-foreground font-mono">{displayStoreId}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Inline stats — visible even when collapsed */}
          <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              {store.product_count} {t('steps.addStore.products').toLowerCase()}
            </span>
            <span className="flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5" />
              {store.category_count} {t('steps.addStore.categories').toLowerCase()}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x">
            <div className="px-5 py-3.5">
              <div className="text-xl font-bold">{store.product_count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {t('steps.addStore.products')}
              </div>
            </div>
            <div className="px-5 py-3.5">
              <div className="text-xl font-bold">{store.category_count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {t('steps.addStore.categories')}
              </div>
            </div>
            <div className="px-5 py-3.5">
              <div className="flex items-center gap-1.5">
                <StatusDot health={syncHealth} />
                <span className="text-sm font-medium capitalize">
                  {syncHealth === 'empty' ? 'No data' : syncHealth}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Sync status</div>
            </div>
            <div className="px-5 py-3.5">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">{lastSync}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Last synced</div>
            </div>
          </div>

          {/* Actions bar */}
          <div className="border-t px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  onSyncNow()
                }}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync now'}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View in Square
              </button>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <Unlink className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

interface SummaryPanelProps {
  productCount: number
  categoryCount: number
  storeCount: number
  syncedStoreCount: number
  isSyncing: boolean
  onContinue: () => void
  t: (key: string) => string
}

function SummaryPanel({
  productCount,
  categoryCount,
  storeCount,
  syncedStoreCount,
  isSyncing,
  onContinue,
  t,
}: SummaryPanelProps) {
  return (
    <Card className="overflow-hidden">
      {/* Panel header */}
      <div className="px-5 py-4 border-b">
        <h3 className="text-sm font-semibold">Import Summary</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Overview of your Square catalog sync</p>
      </div>

      {isSyncing ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <Typography variant="small" className="text-muted-foreground">
            Syncing your catalog...
          </Typography>
        </div>
      ) : (
        <>
          {/* Timeline / progress indicator */}
          <div className="px-5 py-4 space-y-4">
            {/* Step 1: Connected */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
                <div className="w-px h-6 bg-border mt-1" />
              </div>
              <div>
                <div className="text-sm font-medium">Square connected</div>
                <div className="text-xs text-muted-foreground">
                  {syncedStoreCount} of {storeCount} stores synced
                </div>
              </div>
            </div>

            {/* Step 2: Catalog imported */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
                <div className="w-px h-6 bg-border mt-1" />
              </div>
              <div>
                <div className="text-sm font-medium">Catalog imported</div>
                <div className="text-xs text-muted-foreground">
                  {productCount} {t('steps.addStore.products').toLowerCase()}, {categoryCount}{' '}
                  {t('steps.addStore.categories').toLowerCase()}
                </div>
              </div>
            </div>

            {/* Step 3: Batch tracking (next) */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 bg-background flex items-center justify-center">
                  <span className="text-[10px] font-bold text-muted-foreground">3</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Set up batch tracking
                </div>
                <div className="text-xs text-muted-foreground">
                  Configure expiry date rules for your products
                </div>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="border-t px-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">{productCount}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Total {t('steps.addStore.products').toLowerCase()}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">{categoryCount}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t('steps.addStore.categories')}
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="border-t p-4">
            <Button onClick={onContinue} size="lg" className="w-full">
              Continue to Batch Tracking Setup
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-2.5">
              You can always come back to manage your Square connection
            </p>
          </div>
        </>
      )}
    </Card>
  )
}

// ─── Utility Functions ────────────────────────────────────

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// ─── Main Component ───────────────────────────────────────

export function AddStoreStep() {
  const t = useTranslations('setupFlow')
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null)

  // Square integration hooks
  const { data: squareStatus } = useSquareStatus()
  const initiateSquareConnect = useInitiateSquareConnect()
  const syncCatalogMutation = useSyncSquareCatalog()
  const syncInventoryMutation = useSyncSquareInventory()

  // Store overviews hook
  const { data: stores } = useStoreOverviews()

  // Filter to only show Square stores
  const squareStores = stores?.filter(store => store.is_square_store) ?? []

  // Get store ID and catalog data
  const storeId = useActiveStoreId()
  const { data: categories, isLoading: isSyncing } = useCategoriesWithTrackingSettings(
    storeId || '',
  )

  // Setup flow navigation
  const { goToNextStep } = useSetupFlowStore()

  const isSquareConnected = squareStatus?.is_connected || false
  const connectionId = squareStatus?.connection_id
  const isSyncingData = syncCatalogMutation.isPending || syncInventoryMutation.isPending

  // Calculate catalog stats
  const categoryCount = categories?.length || 0
  const productCount = categories?.reduce((sum, cat) => sum + cat.product_count, 0) || 0

  // Count synced stores (stores with products)
  const syncedStoreCount = squareStores.filter(store => store.product_count > 0).length

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

  const handleSyncNow = async () => {
    if (!connectionId) {
      toast.error('No Square connection found')
      return
    }

    try {
      // Sync both catalog and inventory
      await syncCatalogMutation.mutateAsync({ connectionId, fullSync: false })
      await syncInventoryMutation.mutateAsync({ connectionId, fullSync: false })
      toast.success('Sync completed successfully')
    } catch (error) {
      console.error('Sync failed:', error)
      toast.error('Sync failed. Please try again.')
    }
  }

  // Show disconnected state if not connected
  if (!isSquareConnected) {
    return (
      <div className="flex flex-col gap-6">
        <Typography variant="h3">{t('steps.addStore.title')}</Typography>

        <Typography variant="p">{t('steps.addStore.description')}</Typography>

        {/* Square Connection Card */}
        <Card
          className="p-6 transition-colors cursor-pointer group hover:border-primary/50"
          onClick={handleSquareConnect}
        >
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

            <Typography variant="h4">{t('steps.addStore.squareDescription')}</Typography>
          </div>
        </Card>
      </div>
    )
  }

  // Show connected state with new two-column layout
  return (
    <div className="flex flex-col gap-6">
      <Typography variant="h3">{t('steps.addStore.titleConnected')}</Typography>

      <Typography variant="p">{t('steps.addStore.descriptionConnected')}</Typography>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6">
        {/* Left: Store list (2/3 width on desktop) */}
        <div className="space-y-5">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">{t('steps.addStore.yourStores')}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {squareStores.length} stores connected from Square
              </p>
            </div>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncingData}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border hover:border-foreground/20 hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingData ? 'animate-spin' : ''}`} />
              {isSyncingData ? 'Syncing...' : 'Sync all stores'}
            </button>
          </div>

          {/* Store cards */}
          <div className="space-y-3">
            {squareStores.map(store => (
              <StoreCard
                key={store.store_id}
                store={store}
                isExpanded={expandedStoreId === store.store_id}
                onToggle={() => toggleStore(store.store_id)}
                onSyncNow={handleSyncNow}
                isSyncing={isSyncingData}
                t={t}
              />
            ))}
          </div>

          {/* Help text */}
          <Card className="flex items-start gap-3 px-5 py-4">
            <div className="mt-0.5">
              <Info className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Products and categories are imported from your Square catalog. LIFO adds batch-level
                expiry tracking on top of your existing product data.
              </p>
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground hover:text-foreground mt-2 transition-colors"
              >
                Learn more about Square sync →
              </button>
            </div>
          </Card>
        </div>

        {/* Right: Summary panel (1/3 width on desktop, moves below on mobile) */}
        <div>
          <SummaryPanel
            productCount={productCount}
            categoryCount={categoryCount}
            storeCount={squareStores.length}
            syncedStoreCount={syncedStoreCount}
            isSyncing={isSyncing}
            onContinue={handleContinueToBatchTracking}
            t={t}
          />
        </div>
      </div>
    </div>
  )
}
