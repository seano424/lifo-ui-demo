'use client'

/**
 * Example component demonstrating all batch creation UI components
 * This file serves as a reference implementation and testing playground
 *
 * To use this component:
 * 1. Import it in a page or component
 * 2. Make sure you have the required hooks from @/hooks/use-draft-batches
 * 3. Ensure user is authenticated and has an active store selected
 *
 * @example
 * ```tsx
 * import { BatchCreationExample } from '@/components/batch-creation/batch-creation-example'
 *
 * export default function TestPage() {
 *   return <BatchCreationExample />
 * }
 * ```
 */

import { useState } from 'react'
import {
  BatchSuccessCard,
  DraftBatchCard,
  ExpiryPresetButtons,
  QuantitySelector,
} from '@/components/batch-creation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { ActivateDraftBatchResult } from '@/hooks/use-draft-batches'

// Mock data for demonstration
const mockProduct = {
  product_id: 'mock-product-1',
  product_name: 'Organic Whole Milk',
  product_brand: 'Happy Farms',
  category_name: 'Dairy',
  typical_shelf_life_days: 7,
  draft_batch_count: 2,
  total_draft_quantity: 24,
  draft_batches: [
    {
      batch_id: 'batch-1',
      batch_number: 'BATCH-001',
      quantity: 12,
      received_date: '2025-01-19',
      created_at: '2025-01-19T10:00:00Z',
    },
    {
      batch_id: 'batch-2',
      batch_number: 'BATCH-002',
      quantity: 12,
      received_date: '2025-01-19',
      created_at: '2025-01-19T10:05:00Z',
    },
  ],
  last_expiry_days: 7,
  last_batch_expiry_date: '2025-01-26',
  total_count: 1,
}

const mockSuccessResult: ActivateDraftBatchResult = {
  success: true,
  activated_batch_id: 'activated-batch-1',
  activated_quantity: 10,
  expiry_date: '2025-01-26',
  was_split: false,
  remaining_draft_batch_id: null,
  remaining_draft_quantity: null,
  message: 'Batch successfully activated',
}

const mockSplitResult: ActivateDraftBatchResult = {
  success: true,
  activated_batch_id: 'activated-batch-2',
  activated_quantity: 10,
  expiry_date: '2025-01-26',
  was_split: true,
  remaining_draft_batch_id: 'remaining-batch-1',
  remaining_draft_quantity: 14,
  message: 'Batch split successfully',
}

export function BatchCreationExample() {
  // Component 1: QuantitySelector state
  const [quantity, setQuantity] = useState(1)

  // Component 2: ExpiryPresetButtons state
  const [selectedDays, setSelectedDays] = useState<number | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Component 4: BatchSuccessCard state
  const [successResult, setSuccessResult] = useState<ActivateDraftBatchResult | null>(null)

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Batch Creation Components
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Interactive examples of all batch creation UI components
        </p>
      </div>

      <Separator />

      {/* Component 1: QuantitySelector */}
      <Card>
        <CardHeader>
          <CardTitle>1. QuantitySelector</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Touch-friendly quantity selector with +/- buttons
          </p>
          <QuantitySelector value={quantity} onChange={setQuantity} min={1} max={50} />
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setQuantity(1)}>
              Reset to 1
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuantity(10)}>
              Set to 10
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuantity(25)}>
              Set to 25
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Component 2: ExpiryPresetButtons */}
      <Card>
        <CardHeader>
          <CardTitle>2. ExpiryPresetButtons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Preset expiry date buttons with suggested days highlighting
          </p>
          <ExpiryPresetButtons
            onSelect={setSelectedDays}
            onPickDate={() => setShowDatePicker(!showDatePicker)}
            selectedDays={selectedDays}
            suggestedDays={7} // Highlights the +7d button
          />
          {showDatePicker && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Custom date picker would open here
              </p>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedDays(null)
              setShowDatePicker(false)
            }}
          >
            Clear Selection
          </Button>
        </CardContent>
      </Card>

      {/* Component 3: DraftBatchCard */}
      <Card>
        <CardHeader>
          <CardTitle>3. DraftBatchCard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Product card with draft batches and quick actions
          </p>
          <DraftBatchCard
            product={mockProduct}
            onClick={() => {
              alert('Draft batch card clicked!')
            }}
          />
        </CardContent>
      </Card>

      {/* Component 4: BatchSuccessCard */}
      <Card>
        <CardHeader>
          <CardTitle>4. BatchSuccessCard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Success card with checkmark animation and split batch handling
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSuccessResult(mockSuccessResult)}>
              Show Success
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSuccessResult(mockSplitResult)}>
              Show Split Batch
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSuccessResult(null)}>
              Clear
            </Button>
          </div>
          {successResult && (
            <BatchSuccessCard
              result={successResult}
              onAddAnother={() => {
                alert('Add another clicked!')
                setSuccessResult(null)
              }}
              onSkip={() => {
                alert('Skip clicked!')
                setSuccessResult(null)
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Complete Workflow Example */}
      <Card className="border-2 border-primary-200 dark:border-primary-800">
        <CardHeader>
          <CardTitle>Complete Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Example showing all components working together in a batch creation flow
          </p>

          <div className="space-y-4">
            <DraftBatchCard
              product={mockProduct}
              onClick={() => {
                console.log('Opening batch creation sheet...')
              }}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Quantity
              </label>
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={mockProduct.total_draft_quantity}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Choose Expiry Date
              </label>
              <ExpiryPresetButtons
                onSelect={setSelectedDays}
                onPickDate={() => setShowDatePicker(!showDatePicker)}
                selectedDays={selectedDays}
                suggestedDays={mockProduct.last_expiry_days}
              />
            </div>

            <Button
              size="lg"
              className="w-full"
              disabled={!selectedDays}
              onClick={() => {
                setSuccessResult({
                  ...mockSuccessResult,
                  activated_quantity: quantity,
                })
              }}
            >
              Activate Batch ({quantity} units)
            </Button>
          </div>

          {successResult && (
            <BatchSuccessCard
              result={successResult}
              onAddAnother={() => setSuccessResult(null)}
              onSkip={() => setSuccessResult(null)}
            />
          )}
        </CardContent>
      </Card>

      {/* Documentation Link */}
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            📚 For complete documentation and API reference, see{' '}
            <code className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs">
              components/batch-creation/README.md
            </code>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
