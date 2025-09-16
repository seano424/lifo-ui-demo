// components/todos/todo-actions-example.tsx
// Example implementation showing how to use the batch action hooks

'use client'

import { Heart, Percent, ShoppingCart, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useBatchActionRPC } from '@/hooks/use-batch-actions-rpc'
import type { ActionableBatch } from '@/hooks/use-scoring-analytics'

interface TodoActionsExampleProps {
  batch: ActionableBatch
  onActionComplete?: () => void
}

export function TodoActionsExample({ batch, onActionComplete }: TodoActionsExampleProps) {
  const {
    executeDonate,
    executeDiscount,
    executeSold,
    executeDispose,
    executeDismiss,
    isProcessing,
    isDonating,
    isDiscounting,
    isMarkingSold,
    isDisposing,
    isDismissing,
  } = useBatchActionRPC()

  const [donationRecipient, setDonationRecipient] = useState('default-charity-id')
  const [customQuantity, setCustomQuantity] = useState(batch.current_quantity)
  const [notes, setNotes] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Quick action handlers
  const handleQuickDonate = async () => {
    try {
      await executeDonate({
        batchId: batch.batch_id,
        quantity: batch.current_quantity,
        donationRecipientId: donationRecipient,
        notes: notes || `Quick donation - ${batch.recommendation}`,
      })
      onActionComplete?.()
    } catch (error) {
      console.error('Donation failed:', error)
    }
  }

  const handleQuickDiscount = async () => {
    try {
      await executeDiscount({
        batchId: batch.batch_id,
        quantity: batch.current_quantity,
        discountPercentage: batch.discount_percent || 20,
        notes: notes || `Applied ${batch.discount_percent}% discount - ${batch.reason}`,
      })
      onActionComplete?.()
    } catch (error) {
      console.error('Discount failed:', error)
    }
  }

  const handleMarkSold = async () => {
    try {
      await executeSold({
        batchId: batch.batch_id,
        quantity: customQuantity,
        notes: notes || 'Marked as sold from todos',
      })
      onActionComplete?.()
    } catch (error) {
      console.error('Mark sold failed:', error)
    }
  }

  const handleDispose = async () => {
    try {
      await executeDispose({
        batchId: batch.batch_id,
        quantity: customQuantity,
        disposalReason: 'expired',
        notes: notes || 'Disposed due to expiry',
      })
      onActionComplete?.()
    } catch (error) {
      console.error('Dispose failed:', error)
    }
  }

  const handleDismiss = async () => {
    try {
      await executeDismiss({
        batchId: batch.batch_id,
        dismissalReason: 'not_applicable',
        notes: notes || 'Dismissed recommendation',
      })
      onActionComplete?.()
    } catch (error) {
      console.error('Dismiss failed:', error)
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-500'
      case 'high':
        return 'bg-orange-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      {/* Batch Info Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{batch.product_name}</h3>
          <p className="text-sm text-muted-foreground">
            {batch.current_quantity} units • {batch.location_code} • €
            {batch.potential_loss.toFixed(2)} at risk
          </p>
        </div>
        <Badge className={`text-white ${getUrgencyColor(batch.urgency)}`}>{batch.urgency}</Badge>
      </div>

      {/* Recommendation */}
      <div className="bg-muted/50 p-3 rounded">
        <p className="text-sm">
          <strong>Recommendation:</strong> {batch.recommendation}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{batch.reason}</p>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handleQuickDonate}
          disabled={isProcessing}
          className="flex items-center gap-2"
          variant="outline"
        >
          <Heart className="h-4 w-4" />
          {isDonating ? 'Donating...' : 'Donate'}
        </Button>

        <Button
          onClick={handleQuickDiscount}
          disabled={isProcessing}
          className="flex items-center gap-2"
          variant="outline"
        >
          <Percent className="h-4 w-4" />
          {isDiscounting ? 'Applying...' : `${batch.discount_percent}% Off`}
        </Button>
      </div>

      {/* Advanced Actions Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full"
      >
        {showAdvanced ? 'Hide' : 'Show'} Advanced Actions
      </Button>

      {/* Advanced Actions */}
      {showAdvanced && (
        <div className="space-y-4 border-t pt-4">
          {/* Quantity Selector */}
          <div>
            <label className="text-sm font-medium">Quantity to Process</label>
            <Input
              type="number"
              value={customQuantity}
              onChange={e => setCustomQuantity(parseInt(e.target.value, 10) || 0)}
              min={1}
              max={batch.current_quantity}
              className="mt-1"
            />
          </div>

          {/* Donation Recipient */}
          <div>
            <label className="text-sm font-medium">Donation Recipient</label>
            <Select value={donationRecipient} onValueChange={setDonationRecipient}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default-charity-id">Local Food Bank</SelectItem>
                <SelectItem value="emergency-shelter">Emergency Shelter</SelectItem>
                <SelectItem value="community-kitchen">Community Kitchen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={handleMarkSold}
              disabled={isProcessing}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <ShoppingCart className="h-3 w-3" />
              {isMarkingSold ? 'Processing...' : 'Mark Sold'}
            </Button>

            <Button
              onClick={handleDispose}
              disabled={isProcessing}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              {isDisposing ? 'Processing...' : 'Dispose'}
            </Button>

            <Button
              onClick={handleDismiss}
              disabled={isProcessing}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              {isDismissing ? 'Processing...' : 'Dismiss'}
            </Button>
          </div>
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Processing action...
        </div>
      )}
    </div>
  )
}

// Usage example for bulk actions
export function BulkActionsExample({ selectedBatches }: { selectedBatches: ActionableBatch[] }) {
  const { executeBulk, isBulkProcessing } = useBatchActionRPC()

  const handleBulkDonate = async () => {
    try {
      await executeBulk({
        batchIds: selectedBatches.map(b => b.batch_id),
        actionType: 'donate',
        actionParams: {
          donation_recipient_id: 'default-charity-id',
          notes: `Bulk donation of ${selectedBatches.length} items`,
        },
      })
    } catch (error) {
      console.error('Bulk donation failed:', error)
    }
  }

  const handleBulkDiscount = async () => {
    try {
      await executeBulk({
        batchIds: selectedBatches.map(b => b.batch_id),
        actionType: 'discount',
        actionParams: {
          discount_percentage: 25,
          notes: `Bulk 25% discount applied to ${selectedBatches.length} items`,
        },
      })
    } catch (error) {
      console.error('Bulk discount failed:', error)
    }
  }

  if (selectedBatches.length === 0) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-background border rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{selectedBatches.length} items selected</span>
        <div className="flex gap-2">
          <Button onClick={handleBulkDonate} disabled={isBulkProcessing} size="sm">
            Bulk Donate
          </Button>
          <Button onClick={handleBulkDiscount} disabled={isBulkProcessing} size="sm">
            Bulk Discount
          </Button>
        </div>
      </div>
    </div>
  )
}
