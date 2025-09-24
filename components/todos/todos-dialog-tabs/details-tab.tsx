'use client'

import { Badge } from '@/components/ui/badge'
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
    (new Date(selectedBatch.expiry_date || '').getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
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
        return {
          label: 'Expiring Soon',
          className: 'text-orange-600 bg-orange-50',
        }
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
          <Typography variant="h4">Product Information</Typography>
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <Typography variant="p">Product</Typography>
              <Typography variant="p">
                <span>{selectedBatch.product_name || ''}</span>
                {selectedBatch.product_brand && (
                  <span>{selectedBatch.product_brand}</span>
                )}
              </Typography>
            </div>
            <Typography
              variant="p"
              className="flex justify-between capitalize"
            >
              <span>Batch Number</span>
              <span>{selectedBatch.batch_number || ''}</span>
            </Typography>
            <Typography
              variant="p"
              className="flex justify-between capitalize"
            >
              <span>Status</span>
              <span>
                <span
                  className={cn('px-2 py-1 rounded', statusDisplay.className)}
                >
                  {statusDisplay.label}
                </span>
              </span>
            </Typography>
            <Typography
              variant="p"
              className="flex justify-between capitalize"
            >
              <span>Expiry Date</span>
              <span className="flex items-center gap-2">
                {formatDate(selectedBatch.expiry_date || '')}
                <span
                  className={cn(
                    daysToExpiry < 0
                      ? 'text-primary-600'
                      : daysToExpiry <= 7
                        ? 'text-primary-600'
                        : 'text-primary-600'
                  )}
                >
                  (
                  {daysToExpiry < 0
                    ? `${Math.abs(daysToExpiry)} days ago`
                    : `${daysToExpiry} days`}
                  )
                </span>
              </span>
            </Typography>
          </div>
        </div>

        {/* Inventory & Pricing */}
        <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
          <Typography variant="h4">Inventory & Pricing</Typography>
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <Typography
              variant="p"
              className="flex justify-between capitalize"
            >
              <span>Current Quantity</span>
              <span>{selectedBatch.current_quantity || 0} units</span>
            </Typography>
            <Typography
              variant="p"
              className="flex justify-between capitalize"
            >
              <span>Cost Price</span>
              <span>{formatCurrency(selectedBatch.cost_price || 0)}</span>
            </Typography>
            <Typography
              variant="p"
              className="flex justify-between capitalize"
            >
              <span>Original Price</span>
              <span>{formatCurrency(selectedBatch.selling_price || 0)}</span>
            </Typography>
            {(selectedBatch.current_selling_price || 0) !==
              (selectedBatch.selling_price || 0) && (
              <Typography
                variant="p"
                className="flex justify-between capitalize"
              >
                <span>Current Price</span>
                <span>
                  {formatCurrency(selectedBatch.current_selling_price || 0)}
                  <span className="ml-1 text-xs">
                    (
                    {Math.round(
                      (((selectedBatch.selling_price || 0) -
                        (selectedBatch.current_selling_price || 0)) /
                        (selectedBatch.selling_price || 1)) *
                        100
                    )}
                    % off)
                  </span>
                </span>
              </Typography>
            )}
            <Typography
              variant="p"
              className="flex justify-between capitalize"
            >
              <span>Potential Loss</span>
              <span>
                {formatCurrency(selectedBatch.potential_loss_value || 0)}
              </span>
            </Typography>
          </div>
        </div>

        {/* Action History */}
        <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
          <Typography variant="h4">Action History</Typography>
          <div className="bg-white rounded-2xl p-4 space-y-3">
            {selectedBatch.last_action_type ? (
              <>
                <Typography
                  variant="p"
                  className="flex justify-between capitalize"
                >
                  <span>Last Action</span>
                  <span>
                    {selectedBatch.last_action_type.replace('_', ' ')}
                  </span>
                </Typography>
                <Typography
                  variant="p"
                  className="flex justify-between capitalize"
                >
                  <span>Last Action Time</span>
                  <span>
                    {formatDateTime(selectedBatch.last_action_time || '')}
                  </span>
                </Typography>
                {selectedBatch.last_action_quantity && (
                  <Typography
                    variant="p"
                    className="flex justify-between capitalize"
                  >
                    <span>Last Action Quantity</span>
                    <span>{selectedBatch.last_action_quantity || 0} units</span>
                  </Typography>
                )}
              </>
            ) : (
              <Typography
                variant="p"
                className="text-center py-2"
              >
                No actions taken yet
              </Typography>
            )}

            <div className="border-t pt-3 space-y-2">
              <Typography
                variant="p"
                className="uppercase"
              >
                Total Actions
              </Typography>
              <div>
                {(selectedBatch.total_sold_quantity || 0) > 0 && (
                  <Typography
                    variant="p"
                    className="flex justify-between capitalize"
                  >
                    <span>Sold:</span>
                    <span>{selectedBatch.total_sold_quantity || 0}</span>
                  </Typography>
                )}
                {(selectedBatch.total_discounted_quantity || 0) > 0 && (
                  <Typography
                    variant="p"
                    className="flex justify-between capitalize"
                  >
                    <span>Discounted:</span>
                    <span>{selectedBatch.total_discounted_quantity || 0}</span>
                  </Typography>
                )}
                {(selectedBatch.total_donated_quantity || 0) > 0 && (
                  <Typography
                    variant="p"
                    className="flex justify-between capitalize"
                  >
                    <span>Donated:</span>
                    <span>{selectedBatch.total_donated_quantity || 0}</span>
                  </Typography>
                )}
                {(selectedBatch.total_disposed_quantity || 0) > 0 && (
                  <Typography
                    variant="p"
                    className="flex justify-between capitalize"
                  >
                    <span>Disposed:</span>
                    <span>{selectedBatch.total_disposed_quantity || 0}</span>
                  </Typography>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        {selectedBatch.ai_recommendation && (
          <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
            <Typography variant="h4">AI Insights</Typography>
            <div className="bg-white rounded-2xl p-4 space-y-3">
              <div className="flex justify-between capitalize">
                <span>Recommendation</span>
                <span>
                  {(selectedBatch.ai_recommendation || '').replace('_', ' ')}
                </span>
              </div>
              {selectedBatch.composite_score && (
                <div className="flex justify-between capitalize">
                  <span>Priority Score</span>
                  <span>
                    {Math.round((selectedBatch.composite_score || 0) * 100)}%
                  </span>
                </div>
              )}
              {selectedBatch.urgency_level && (
                <div className="flex justify-between capitalize">
                  <span>Urgency</span>
                  <Badge
                    variant={
                      selectedBatch.urgency_level === 'critical'
                        ? 'primary'
                        : selectedBatch.urgency_level === 'high'
                          ? 'primary'
                          : selectedBatch.urgency_level === 'medium'
                            ? 'secondary'
                            : 'secondary'
                    }
                  >
                    {selectedBatch.urgency_level || ''}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* footer */}
      <div className="sticky bottom-0 bg-brand-white px-8 py-4 flex justify-center border-t border-muted gap-4">
        <Button
          size="lg"
          variant="subtleGray"
          onClick={onClose}
          className="rounded-full px-40"
        >
          Close
        </Button>
      </div>
    </div>
  )
}
