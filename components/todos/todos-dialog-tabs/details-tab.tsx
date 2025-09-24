'use client'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { cn } from '@/lib/utils'

interface DetailsTabProps {
  selectedBatch: TodoItem
  onClose: () => void
}

export function DetailsTab({ selectedBatch, onClose }: DetailsTabProps) {
  // Calculate metrics
  const daysToExpiry = Math.floor(
    (new Date(selectedBatch.expiry_date || '').getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )

  const formatCurrency = (value: number) => `€${value.toFixed(2)}`
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get status color and label
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'expired':
        return { label: 'Expired', className: 'text-red-600 bg-red-50' }
      case 'expiring_soon':
        return { label: 'Expiring Soon', className: 'text-orange-600 bg-orange-50' }
      case 'fresh':
        return { label: 'Fresh', className: 'text-green-600 bg-green-50' }
      default:
        return { label: status, className: 'text-gray-600 bg-gray-50' }
    }
  }

  const statusDisplay = getStatusDisplay(selectedBatch.todo_state || '')

  return (
    <div className="flex flex-col h-full bg-muted">
      {/* content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-100 scrollbar-track-transparent flex flex-col divide-y-4 divide-white">
        {/* Product Information */}
        <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
          <Typography variant="p" className="xs:text-lg">
            Product Information
          </Typography>
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Product</span>
              <div className="text-sm font-medium text-right">
                <div>{selectedBatch.product_name || ''}</div>
                {selectedBatch.product_brand && (
                  <div className="text-muted-foreground">{selectedBatch.product_brand}</div>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Batch Number</span>
              <span className="text-sm font-medium">{selectedBatch.batch_number || ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span
                className={cn('text-sm font-medium px-2 py-1 rounded', statusDisplay.className)}
              >
                {statusDisplay.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Expiry Date</span>
              <span className="text-sm font-medium">
                {formatDate(selectedBatch.expiry_date || '')}
                <span
                  className={cn(
                    'ml-2 text-xs',
                    daysToExpiry < 0
                      ? 'text-red-600'
                      : daysToExpiry <= 7
                        ? 'text-orange-600'
                        : 'text-green-600',
                  )}
                >
                  (
                  {daysToExpiry < 0 ? `${Math.abs(daysToExpiry)} days ago` : `${daysToExpiry} days`}
                  )
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Inventory & Pricing */}
        <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
          <Typography variant="p" className="xs:text-lg">
            Inventory & Pricing
          </Typography>
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Current Quantity</span>
              <span className="text-sm font-medium">
                {selectedBatch.current_quantity || 0} units
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cost Price</span>
              <span className="text-sm font-medium">
                {formatCurrency(selectedBatch.cost_price || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Original Price</span>
              <span className="text-sm font-medium">
                {formatCurrency(selectedBatch.selling_price || 0)}
              </span>
            </div>
            {(selectedBatch.current_selling_price || 0) !== (selectedBatch.selling_price || 0) && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Current Price</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(selectedBatch.current_selling_price || 0)}
                  <span className="ml-1 text-xs">
                    (
                    {Math.round(
                      (((selectedBatch.selling_price || 0) -
                        (selectedBatch.current_selling_price || 0)) /
                        (selectedBatch.selling_price || 1)) *
                        100,
                    )}
                    % off)
                  </span>
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Potential Loss</span>
              <span className="text-sm font-medium text-red-600">
                {formatCurrency(selectedBatch.potential_loss_value || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Action History */}
        <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
          <Typography variant="p" className="xs:text-lg">
            Action History
          </Typography>
          <div className="bg-white rounded-2xl p-4 space-y-3">
            {selectedBatch.last_action_type ? (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Action</span>
                  <span className="text-sm font-medium capitalize">
                    {selectedBatch.last_action_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Action Time</span>
                  <span className="text-sm font-medium">
                    {formatDateTime(selectedBatch.last_action_time || '')}
                  </span>
                </div>
                {selectedBatch.last_action_quantity && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Action Quantity</span>
                    <span className="text-sm font-medium">
                      {selectedBatch.last_action_quantity || 0} units
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-2">
                No actions taken yet
              </div>
            )}

            <div className="border-t pt-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase">
                Total Actions
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(selectedBatch.total_sold_quantity || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sold:</span>
                    <span className="font-medium">{selectedBatch.total_sold_quantity || 0}</span>
                  </div>
                )}
                {(selectedBatch.total_discounted_quantity || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discounted:</span>
                    <span className="font-medium">
                      {selectedBatch.total_discounted_quantity || 0}
                    </span>
                  </div>
                )}
                {(selectedBatch.total_donated_quantity || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Donated:</span>
                    <span className="font-medium">{selectedBatch.total_donated_quantity || 0}</span>
                  </div>
                )}
                {(selectedBatch.total_disposed_quantity || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Disposed:</span>
                    <span className="font-medium">
                      {selectedBatch.total_disposed_quantity || 0}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        {selectedBatch.ai_recommendation && (
          <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
            <Typography variant="p" className="xs:text-lg">
              AI Insights
            </Typography>
            <div className="bg-white rounded-2xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Recommendation</span>
                <span className="text-sm font-medium capitalize">
                  {(selectedBatch.ai_recommendation || '').replace('_', ' ')}
                </span>
              </div>
              {selectedBatch.composite_score && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Priority Score</span>
                  <span className="text-sm font-medium">
                    {Math.round((selectedBatch.composite_score || 0) * 100)}%
                  </span>
                </div>
              )}
              {selectedBatch.urgency_level && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Urgency</span>
                  <span
                    className={cn(
                      'text-sm font-medium capitalize px-2 py-1 rounded',
                      selectedBatch.urgency_level === 'critical'
                        ? 'bg-red-50 text-red-600'
                        : selectedBatch.urgency_level === 'high'
                          ? 'bg-orange-50 text-orange-600'
                          : selectedBatch.urgency_level === 'medium'
                            ? 'bg-yellow-50 text-yellow-600'
                            : 'bg-green-50 text-green-600',
                    )}
                  >
                    {selectedBatch.urgency_level || ''}
                  </span>
                </div>
              )}
              {false && selectedBatch.ai_recommendation && (
                <div className="border-t pt-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase mb-2">
                    AI Reasoning
                  </div>
                  <p className="text-sm text-gray-700">{selectedBatch.ai_recommendation || ''}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* footer */}
      <div className="sticky bottom-0 bg-brand-white px-8 py-4 flex justify-center border-t border-muted gap-4">
        <Button size="lg" variant="subtleGray" onClick={onClose} className="rounded-full px-12">
          Close
        </Button>
      </div>
    </div>
  )
}
