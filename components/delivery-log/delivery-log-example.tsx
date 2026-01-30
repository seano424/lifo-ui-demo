'use client'

/**
 * Example showing how to use DeliveryLogSheet in real scenarios
 *
 * Common use cases:
 * 1. Dashboard button that opens delivery log
 * 2. Inventory page quick-add button
 * 3. Floating action button for mobile
 */

import { useState } from 'react'
import { Package, Plus, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DeliveryLogSheet } from './delivery-log-sheet'
import { useDraftBatchesSummary, useRecentDeliveryProducts } from '@/hooks/use-draft-batches'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { Typography } from '../ui/typography'

// ============================================================================
// Example 1: Simple Button
// Opens delivery log sheet from anywhere in the app
// ============================================================================
export function DeliveryLogButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="default" size="lg">
        <Truck className="h-5 w-5 mr-2" />
        Log Delivery
      </Button>

      <DeliveryLogSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        onComplete={() => {
          console.log('Delivery logged and expiry dates added!')
        }}
      />
    </>
  )
}

// ============================================================================
// Example 2: Dashboard Card with Stats
// Shows recent delivery count and opens sheet
// ============================================================================
export function DeliveryDashboardCard() {
  const [isOpen, setIsOpen] = useState(false)
  const storeId = useActiveStoreId()
  const { data: recentProducts } = useRecentDeliveryProducts(20, storeId || undefined)
  const { data: draftSummary } = useDraftBatchesSummary(storeId || undefined)

  return (
    <>
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Quick Add Delivery</CardTitle>
            <Truck className="h-5 w-5 text-primary-800 dark:text-primary-400" />
          </div>
          <CardDescription>Add products from recent deliveries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {recentProducts?.length || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Recent products</p>
            </div>
            {draftSummary && draftSummary.total_draft_batches > 0 && (
              <Badge variant="secondary" className="text-base px-3 py-1">
                {draftSummary.total_draft_batches} drafts
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <DeliveryLogSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        onComplete={() => {
          console.log('Delivery complete!')
        }}
      />
    </>
  )
}

// ============================================================================
// Example 3: Floating Action Button (Mobile)
// Fixed button at bottom-right for quick access
// ============================================================================
export function DeliveryFloatingButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center"
        aria-label="Quick add delivery"
      >
        <Plus className="h-6 w-6" />
      </button>

      <DeliveryLogSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        onComplete={() => {
          console.log('Delivery logged!')
        }}
      />
    </>
  )
}

// ============================================================================
// Example 4: Inventory Page Integration
// Button on inventory page with pending drafts indicator
// ============================================================================
export function InventoryDeliveryButton() {
  const [isOpen, setIsOpen] = useState(false)
  const storeId = useActiveStoreId()
  const { data: draftSummary } = useDraftBatchesSummary(storeId || undefined)

  const hasDrafts = draftSummary && draftSummary.total_draft_batches > 0

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="default" size="lg" className="relative">
        <Package className="h-5 w-5 mr-2" />
        Log Delivery
        {hasDrafts && (
          <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-xs font-semibold">
            {draftSummary.total_draft_batches}
          </Badge>
        )}
      </Button>

      <DeliveryLogSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        onComplete={() => {
          console.log('Delivery workflow complete!')
        }}
      />
    </>
  )
}

// ============================================================================
// Example 5: Complete Demo
// Comprehensive example showing all features
// ============================================================================
export function DeliveryLogDemo() {
  const storeId = useActiveStoreId()
  const { data: recentProducts, isLoading } = useRecentDeliveryProducts(20, storeId || undefined)
  const { data: draftSummary } = useDraftBatchesSummary(storeId || undefined)

  if (isLoading) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-8">
      <div>
        <Typography variant="h1" color="primary">
          Delivery Log Examples
        </Typography>
        <Typography variant="p" color="muted">
          Interactive examples showing different ways to use the DeliveryLogSheet component
        </Typography>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <Typography variant="h2" color="primary">
                {recentProducts?.length || 0}
              </Typography>
              <Typography variant="p" color="muted">
                Recent Products
              </Typography>
            </div>
            <div className="text-center">
              <Typography variant="h2" color="primary">
                {draftSummary?.total_draft_batches || 0}
              </Typography>
              <Typography variant="p" color="muted">
                Pending Drafts
              </Typography>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example 1 */}
      <Card>
        <CardHeader>
          <CardTitle>Example 1: Simple Button</CardTitle>
          <CardDescription>Basic button that opens the delivery log sheet</CardDescription>
        </CardHeader>
        <CardContent>
          <DeliveryLogButton />
        </CardContent>
      </Card>

      {/* Example 2 */}
      <Card>
        <CardHeader>
          <CardTitle>Example 2: Dashboard Card</CardTitle>
          <CardDescription>Clickable card with stats that opens the sheet</CardDescription>
        </CardHeader>
        <CardContent>
          <DeliveryDashboardCard />
        </CardContent>
      </Card>

      {/* Example 4 */}
      <Card>
        <CardHeader>
          <CardTitle>Example 4: Inventory Page Button</CardTitle>
          <CardDescription>Button with pending drafts indicator</CardDescription>
        </CardHeader>
        <CardContent>
          <InventoryDeliveryButton />
        </CardContent>
      </Card>

      {/* Flow Diagram */}
      <Card className="border-2 border-primary-200 dark:border-primary-800">
        <CardHeader>
          <CardTitle>Delivery Log Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white font-bold text-sm">
                1
              </div>
              <Typography variant="p" color="muted">
                User opens delivery log sheet
              </Typography>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white font-bold text-sm">
                2
              </div>
              <Typography variant="p" color="muted">
                Adds products via quick-add buttons or custom quantity
              </Typography>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white font-bold text-sm">
                3
              </div>
              <Typography variant="p" color="muted">
                Reviews summary and clicks "Done with Delivery"
              </Typography>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white font-bold text-sm">
                4
              </div>
              <Typography variant="p" color="muted">
                System creates draft batches in database
              </Typography>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white font-bold text-sm">
                5
              </div>
              <Typography variant="p" color="muted">
                Prompt: "Add expiry dates now?" → Opens BatchCreationSheet
              </Typography>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card>
        <CardContent className="p-6">
          <Typography variant="p" color="muted">
            📚 For complete documentation and API reference, see{' '}
            <Typography variant="code" color="primary">
              components/delivery-log/
            </Typography>
          </Typography>
        </CardContent>
      </Card>
    </div>
  )
}
