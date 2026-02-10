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
import { cn } from '@/lib/utils'
import { useCategoriesWithTrackingSettings } from '@/lib/queries/batch-tracking-onboarding'
import { useActiveStoreId, useStoreState } from '@/lib/stores/store-context'
import { useSetupFlowStore } from '@/lib/stores/setup-flow-store'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  ArrowRight,
  Store,
  Package,
  FolderTree,
  ExternalLink,
  Unlink,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Info,
} from 'lucide-react'

// ─── Helper Components ────────────────────────────────────

type SyncHealth = 'healthy' | 'empty' | 'stale' | 'error'

interface StatusDotProps {
  health: SyncHealth
}

function StatusDot({ health }: StatusDotProps) {
  const styles: Record<SyncHealth, string> = {
    healthy: 'bg-foreground',
    empty: 'bg-muted-foreground/40',
    stale: 'bg-muted-foreground/60',
    error: 'bg-muted-foreground/30 ring-2 ring-muted-foreground/40',
  }

  return <span className={cn('inline-block w-2 h-2 rounded-full', styles[health])} />
}

interface StoreCardProps {
  store: StoreOverview
  isExpanded: boolean
  onToggle: () => void
  t: (key: string) => string
}

function StoreCard({ store, isExpanded, onToggle, t }: StoreCardProps) {
  // Get active store to determine if this is the current store
  const { activeStore } = useStoreState()
  const isCurrentStore = activeStore?.store_id === store.store_id

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
    <div className={cn('divide-y divide-border', isCurrentStore && 'border-l-4 border-l-primary')}>
      {/* Store header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 hover:bg-muted transition-colors cursor-pointer grid grid-cols-1 md:grid-cols-12 gap-4 items-center text-left"
      >
        {/* Left side - Store info */}
        <div className="flex items-center gap-4 md:col-span-5">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Typography variant="p">{store.store_name}</Typography>
              <StatusDot health={syncHealth} />
            </div>
            <Typography variant="muted" className="font-mono">
              {displayStoreId}
            </Typography>
          </div>
        </div>

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
          {isCurrentStore && <Badge variant="primary">Active Store</Badge>}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="divide-y divide-border">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-muted">
            <div className="p-4">
              <Typography variant="h4">{store.product_count}</Typography>
              <Typography variant="muted" className="mt-0.5">
                {t('steps.addStore.products')}
              </Typography>
            </div>
            <div className="p-4">
              <Typography variant="h4">{store.category_count}</Typography>
              <Typography variant="muted" className="mt-0.5">
                {t('steps.addStore.categories')}
              </Typography>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-1.5">
                <StatusDot health={syncHealth} />
                <Typography variant="p" className="capitalize">
                  {syncHealth === 'empty' ? 'No data' : syncHealth}
                </Typography>
              </div>
              <Typography variant="muted" className="mt-0.5">
                Sync status
              </Typography>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Typography variant="p">{lastSync}</Typography>
              </div>
              <Typography variant="muted" className="mt-0.5">
                Last synced
              </Typography>
            </div>
          </div>

          {/* Actions bar */}
          {/* NOTE: Sync buttons temporarily hidden during onboarding until backend UPSERT fix is deployed */}
          <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4" />
                View in Square
              </Button>
            </div>
            <Button variant="ghost" size="sm">
              <Unlink className="w-4 h-4" />
              Disconnect
            </Button>
          </div>
        </div>
      )}
    </div>
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
    <div className="border border-muted rounded-xl overflow-hidden">
      {/* Panel header */}
      <div className="p-4 border-b border-muted">
        <Typography variant="h5">Import Summary</Typography>
        <Typography variant="muted" className="mt-1">
          Overview of your Square catalog sync
        </Typography>
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
          <div className="p-4 space-y-4">
            {/* Step 1: Connected */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
                <div className="w-px h-6 bg-border mt-1" />
              </div>
              <div>
                <Typography variant="p" className="font-medium">
                  Square connected
                </Typography>
                <Typography variant="muted">
                  {syncedStoreCount} of {storeCount} stores synced
                </Typography>
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
                <Typography variant="p" className="font-medium">
                  Catalog imported
                </Typography>
                <Typography variant="muted">
                  {productCount} {t('steps.addStore.products').toLowerCase()}, {categoryCount}{' '}
                  {t('steps.addStore.categories').toLowerCase()}
                </Typography>
              </div>
            </div>

            {/* Step 3: Batch tracking (next) */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 bg-background flex items-center justify-center">
                  <Typography variant="extraSmall" className="font-bold text-muted-foreground">
                    3
                  </Typography>
                </div>
              </div>
              <div>
                <Typography variant="p" className="font-medium text-muted-foreground">
                  Set up batch tracking
                </Typography>
                <Typography variant="muted">
                  Configure expiry date rules for your products
                </Typography>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-muted p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Typography variant="h3">{productCount}</Typography>
                <Typography variant="muted" className="mt-0.5">
                  Total {t('steps.addStore.products').toLowerCase()}
                </Typography>
              </div>
              <div>
                <Typography variant="h3">{categoryCount}</Typography>
                <Typography variant="muted" className="mt-0.5">
                  {t('steps.addStore.categories')}
                </Typography>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="border-t border-muted p-4">
            <Button onClick={onContinue} size="lg" className="w-full">
              Continue to Batch Tracking Setup
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Typography variant="extraSmall" className="text-muted-foreground text-center mt-2.5">
              You can always come back to manage your Square connection
            </Typography>
          </div>
        </>
      )}
    </div>
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

/**
 * AddStoreStep - Square store review during onboarding
 *
 * TEMPORARY STATE: Sync buttons are currently hidden in the onboarding flow.
 *
 * Context:
 * - Initial catalog sync happens successfully during OAuth callback
 * - This step shows users their imported stores for review
 * - Manual re-sync buttons are hidden due to backend duplicate key bug
 *
 * Backend Issue:
 * - Catalog sync uses INSERT instead of UPSERT
 * - Causes duplicate key errors when syncing existing products
 * - Affects both regular and full sync modes
 *
 * To Re-enable Sync:
 * 1. Wait for backend to implement UPSERT in catalog sync endpoint
 * 2. Uncomment sync buttons in StoreCard component (actions bar)
 * 3. Uncomment "Sync all stores" button in header section
 * 4. Test that sync works without duplicate key errors
 * 5. Remove these temporary notes
 */
export function AddStoreStep() {
  const t = useTranslations('setupFlow')
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null)

  // Square integration hooks
  const { data: squareStatus } = useSquareStatus()
  const initiateSquareConnect = useInitiateSquareConnect()

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

  // Show disconnected state if not connected
  if (!isSquareConnected) {
    return (
      <div className="flex flex-col gap-6">
        <Typography variant="h3">{t('steps.addStore.title')}</Typography>

        <Typography variant="p">{t('steps.addStore.description')}</Typography>

        {/* Main bordered container */}
        <div className="flex flex-col border border-muted rounded-xl overflow-hidden">
          <div className="p-4 flex flex-col gap-4">
            <Typography variant="h5">Available Integrations</Typography>
            <Typography variant="p">
              Connect your POS system to automatically import products and track inventory
            </Typography>
          </div>

          {/* Square Integration */}
          <div className="divide-y divide-border border-t border-muted">
            <button
              type="button"
              onClick={handleSquareConnect}
              className="p-4 hover:bg-muted transition-colors cursor-pointer grid grid-cols-1 md:grid-cols-12 gap-4 items-center text-left w-full"
            >
              {/* Left side - Square logo and name */}
              <div className="flex items-center gap-4 md:col-span-4">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  <Image src="/square/square-icon.svg" alt="Square" width={20} height={20} />
                </div>
                <Typography variant="p">Square</Typography>
              </div>

              {/* Middle - Description */}
              <div className="md:col-span-6">
                <Typography variant="p">{t('steps.addStore.squareDescription')}</Typography>
              </div>

              {/* Right side - Connect button */}
              <div className="flex items-center gap-5 md:col-span-2 md:justify-end">
                <Typography variant="p">Connect</Typography>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show connected state with bordered container layout
  return (
    <div className="flex flex-col gap-6">
      <Typography variant="h3">{t('steps.addStore.titleConnected')}</Typography>

      <Typography variant="p">{t('steps.addStore.descriptionConnected')}</Typography>

      {/* Main bordered container - matching integrations page style */}
      <div className="flex flex-col border border-muted rounded-xl overflow-hidden">
        {/* Header section */}
        {/* NOTE: Sync button temporarily hidden until backend UPSERT fix is deployed */}
        <div className="p-4 flex flex-col gap-4">
          <div>
            <Typography variant="h5">{t('steps.addStore.yourStores')}</Typography>
            <Typography variant="muted" className="mt-1">
              {squareStores.length} stores connected from Square
            </Typography>
          </div>
        </div>

        {/* Store list - bordered sections */}
        <div className="divide-y divide-border border-t border-muted">
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
        <div className="border-t border-muted p-4 flex items-start gap-3 bg-muted/30">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1">
            <Typography variant="small" className="text-muted-foreground">
              Products and categories are imported from your Square catalog. LIFO adds batch-level
              expiry tracking on top of your existing product data.
            </Typography>
            <Button variant="link" size="sm" className="mt-2 p-0 h-auto text-xs">
              Learn more about Square sync →
            </Button>
          </div>
        </div>
      </div>

      {/* Summary panel below main section */}
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
  )
}
