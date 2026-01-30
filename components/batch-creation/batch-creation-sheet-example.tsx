'use client'

/**
 * Example showing how to use BatchCreationSheet in real scenarios
 *
 * Three common use cases:
 * 1. Dashboard button that opens sheet with all draft batches
 * 2. Product page button that opens sheet for a specific product
 * 3. After delivery logging, open sheet to add expiry dates
 */

import { useState } from 'react'
import { Package, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BatchCreationSheet } from '@/components/batch-creation'
import { useDraftBatchesByProduct, useDraftBatchesSummary } from '@/hooks/use-draft-batches'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { Typography } from '../ui/typography'
// ============================================================================
// Example 1: Dashboard Button
// Opens sheet showing all products with draft batches
// ============================================================================
export function DashboardBatchButton() {
  const [isOpen, setIsOpen] = useState(false)
  const storeId = useActiveStoreId()
  const { data: summary } = useDraftBatchesSummary(storeId || undefined)
  const { data: products } = useDraftBatchesByProduct({}, storeId || undefined)

  if (!summary || summary.total_draft_batches === 0) {
    return null
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="default" size="lg" className="relative">
        <Package className="h-5 w-5 mr-2" />
        Add Expiry Dates
        {summary.total_draft_batches > 0 && (
          <Badge
            variant="secondary"
            className="ml-2 bg-white dark:bg-gray-900 text-primary-800 dark:text-primary-400"
          >
            {summary.total_draft_batches}
          </Badge>
        )}
      </Button>

      <BatchCreationSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        storeId={storeId || ''}
        products={products}
        onComplete={() => {
          console.log('All draft batches processed!')
          // Optionally show a success message or navigate somewhere
        }}
      />
    </>
  )
}

// ============================================================================
// Example 2: Product Page Button
// Opens sheet for a specific product only
// ============================================================================
export function ProductDraftBatchButton({ productId }: { productId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const storeId = useActiveStoreId()
  const { data: products } = useDraftBatchesByProduct({}, storeId || undefined)

  // Find the specific product
  const product = products?.find(p => p.product_id === productId)

  if (!product || product.draft_batch_count === 0) {
    return null
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add Expiry ({product.total_draft_quantity} units)
      </Button>

      <BatchCreationSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        storeId={storeId || ''}
        singleProduct={product}
        onComplete={() => {
          console.log('Product draft batches processed!')
        }}
      />
    </>
  )
}

// ============================================================================
// Example 3: After Delivery Logging
// Automatically opens sheet after delivery is logged
// ============================================================================
export function DeliveryWorkflowExample() {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const storeId = useActiveStoreId()
  const { data: products } = useDraftBatchesByProduct({}, storeId || undefined)

  const handleDeliveryLogged = () => {
    // After delivery is logged, open the batch creation sheet
    // to immediately add expiry dates for the new draft batches
    setIsSheetOpen(true)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Delivery Workflow</CardTitle>
          <CardDescription>Log delivery → Immediately add expiry dates</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDeliveryLogged}>Simulate Delivery Logged</Button>
        </CardContent>
      </Card>

      <BatchCreationSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        storeId={storeId || ''}
        products={products}
        onComplete={() => {
          console.log('Delivery workflow complete!')
        }}
      />
    </div>
  )
}

// ============================================================================
// Example 4: Comprehensive Demo
// Shows all examples together
// ============================================================================
export function BatchCreationSheetDemo() {
  const storeId = useActiveStoreId()
  const { data: summary, isLoading } = useDraftBatchesSummary(storeId || undefined)

  if (isLoading) {
    return <div className="p-4">Loading...</div>
  }

  if (!summary || summary.total_draft_batches === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted mb-4" />
          <Typography variant="p" color="muted">
            No new deliveries found. All batches have expiry dates assigned.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-8">
      <div>
        <Typography variant="h1" color="primary">
          Batch Creation Sheet Examples
        </Typography>
        <Typography variant="p" color="muted">
          Interactive examples showing different ways to use the BatchCreationSheet component
        </Typography>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Draft Batches Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <Typography variant="h2" color="primary">
                {summary.total_draft_batches}
              </Typography>
              <Typography variant="p" color="muted">
                Draft Batches
              </Typography>
            </div>
            <div className="text-center">
              <Typography variant="h2" color="primary">
                {summary.total_units}
              </Typography>
              <Typography variant="p" color="muted">
                Total Units
              </Typography>
            </div>
            <div className="text-center">
              <Typography variant="h2" color="primary">
                {summary.products_with_drafts}
              </Typography>
              <Typography variant="p" color="muted">
                Products
              </Typography>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example 1 */}
      <Card>
        <CardHeader>
          <CardTitle>Example 1: Dashboard Button</CardTitle>
          <CardDescription>Opens sheet with all products that have draft batches</CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardBatchButton />
        </CardContent>
      </Card>

      {/* Example 3 */}
      <Card>
        <CardHeader>
          <CardTitle>Example 3: After Delivery Workflow</CardTitle>
          <CardDescription>Automatically opens sheet after delivery is logged</CardDescription>
        </CardHeader>
        <CardContent>
          <DeliveryWorkflowExample />
        </CardContent>
      </Card>
    </div>
  )
}
