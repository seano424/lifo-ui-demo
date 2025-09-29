'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Typography } from '@/components/ui/typography'
import { useBatchActions } from '@/hooks/use-batches'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import type { Database } from '@/types/supabase'
import { cn } from '@/lib/utils'
import { Edit3, Save, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface DetailsTabProps {
  selectedBatch: TodoItem
  onClose: () => void
}

export function DetailsTab({ selectedBatch, onClose }: DetailsTabProps) {
  const { updateBatch, isUpdating } = useBatchActions()

  // Type-safe batch status
  const validStatuses = ['active', 'expired', 'damaged', 'sold_out', 'reserved'] as const
  type BatchStatus = (typeof validStatuses)[number]

  const isValidStatus = (status: string): status is BatchStatus =>
    validStatuses.includes(status as BatchStatus)

  const formatDateForInput = (date: string | null) =>
    date ? new Date(date).toISOString().split('T')[0] : ''

  // Editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editedValues, setEditedValues] = useState({
    batch_number: selectedBatch.batch_number || '',
    expiry_date: formatDateForInput(selectedBatch.expiry_date),
    current_quantity: selectedBatch.current_quantity || 0,
    cost_price: selectedBatch.cost_price || 0,
    selling_price: selectedBatch.selling_price || 0,
    batch_status: selectedBatch.batch_status || 'active',
  })

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

  // Constants for validation
  const MAX_BATCH_NUMBER_LENGTH = 50
  const MAX_YEARS_IN_PAST = 10
  const MAX_YEARS_IN_FUTURE = 5

  const formatCurrencyValue = (value: number): number => {
    return Math.round(value * 100) / 100 // Ensure 2 decimal places
  }

  const validateForm = (): string | null => {
    // Batch number validation
    if (!editedValues.batch_number?.trim()) {
      return 'Batch number is required'
    }
    if (editedValues.batch_number.length > MAX_BATCH_NUMBER_LENGTH) {
      return `Batch number must be less than ${MAX_BATCH_NUMBER_LENGTH} characters`
    }
    // Basic alphanumeric validation (adjust based on business requirements)
    const batchNumberRegex = /^[a-zA-Z0-9\-_\s]+$/
    if (!batchNumberRegex.test(editedValues.batch_number)) {
      return 'Batch number can only contain letters, numbers, hyphens, underscores, and spaces'
    }

    // Expiry date validation
    if (!editedValues.expiry_date) {
      return 'Expiry date is required'
    }
    const expiryDate = new Date(editedValues.expiry_date)
    const pastLimit = new Date()
    pastLimit.setFullYear(pastLimit.getFullYear() - MAX_YEARS_IN_PAST)
    const futureLimit = new Date()
    futureLimit.setFullYear(futureLimit.getFullYear() + MAX_YEARS_IN_FUTURE)

    if (expiryDate < pastLimit) {
      return `Expiry date cannot be more than ${MAX_YEARS_IN_PAST} years in the past`
    }
    if (expiryDate > futureLimit) {
      return `Expiry date cannot be more than ${MAX_YEARS_IN_FUTURE} years in the future`
    }

    // Quantity validation
    if (editedValues.current_quantity < 0) {
      return 'Quantity must be 0 or greater'
    }
    if (!Number.isInteger(editedValues.current_quantity)) {
      return 'Quantity must be a whole number'
    }

    // Price validation
    if (editedValues.cost_price < 0) {
      return 'Cost price must be 0 or greater'
    }
    if (editedValues.selling_price < 0) {
      return 'Selling price must be 0 or greater'
    }
    // Validate reasonable price limits (adjust based on business requirements)
    const MAX_PRICE = 999999.99
    if (editedValues.cost_price > MAX_PRICE || editedValues.selling_price > MAX_PRICE) {
      return `Prices cannot exceed €${MAX_PRICE.toLocaleString()}`
    }

    return null
  }

  const handleSave = async () => {
    if (!selectedBatch.batch_id) return

    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      await updateBatch({
        batchId: selectedBatch.batch_id,
        updates: {
          batch_number: editedValues.batch_number.trim(),
          expiry_date: editedValues.expiry_date,
          current_quantity: editedValues.current_quantity,
          cost_price: formatCurrencyValue(editedValues.cost_price),
          selling_price: formatCurrencyValue(editedValues.selling_price),
          status: isValidStatus(editedValues.batch_status) ? editedValues.batch_status : 'active',
        } as Database['inventory']['Tables']['batches']['Update'],
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update batch:', error)

      if (error instanceof Error) {
        if (error.message.includes('constraint') || error.message.includes('duplicate')) {
          toast.error('Invalid data: Batch number may already exist or contain invalid characters')
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          toast.error('Network error: Please check your connection and try again')
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          toast.error('Permission denied: You may not have access to update this batch')
        } else {
          toast.error(`Update failed: ${error.message}`)
        }
      } else {
        toast.error('An unexpected error occurred while updating the batch')
      }
    }
  }

  const handleCancel = () => {
    setEditedValues({
      batch_number: selectedBatch.batch_number || '',
      expiry_date: formatDateForInput(selectedBatch.expiry_date),
      current_quantity: selectedBatch.current_quantity || 0,
      cost_price: selectedBatch.cost_price || 0,
      selling_price: selectedBatch.selling_price || 0,
      batch_status: selectedBatch.batch_status || 'active',
    })
    setIsEditing(false)
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
          <div className="flex items-center justify-between">
            <Typography variant="h4">Product Information</Typography>
            {!isEditing ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isUpdating ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-start">
              <Typography variant="p">Product</Typography>
              <Typography variant="p">
                <span>{selectedBatch.product_name || ''}</span>
                {selectedBatch.product_brand && <span> - {selectedBatch.product_brand}</span>}
              </Typography>
            </div>

            <div className="flex justify-between items-center">
              <Label htmlFor="batch-number">Batch Number</Label>
              {isEditing ? (
                <Input
                  id="batch-number"
                  value={editedValues.batch_number}
                  onChange={e =>
                    setEditedValues(prev => ({ ...prev, batch_number: e.target.value }))
                  }
                  className="w-32"
                />
              ) : (
                <Typography variant="p">{selectedBatch.batch_number || ''}</Typography>
              )}
            </div>

            <div className="flex justify-between items-center">
              <Label htmlFor="status">Status</Label>
              {isEditing ? (
                <Select
                  value={editedValues.batch_status}
                  onValueChange={value =>
                    setEditedValues(prev => ({ ...prev, batch_status: value }))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="sold_out">Sold Out</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className={cn('px-2 py-1 rounded text-sm', statusDisplay.className)}>
                  {statusDisplay.label}
                </span>
              )}
            </div>

            <div className="flex justify-between items-center">
              <Label htmlFor="expiry-date">Expiry Date</Label>
              {isEditing ? (
                <Input
                  id="expiry-date"
                  type="date"
                  value={editedValues.expiry_date}
                  onChange={e =>
                    setEditedValues(prev => ({ ...prev, expiry_date: e.target.value }))
                  }
                  className="w-40"
                />
              ) : (
                <span className="flex items-center gap-2">
                  {formatDate(selectedBatch.expiry_date || '')}
                  <span
                    className={cn(
                      'text-sm',
                      daysToExpiry < 0
                        ? 'text-red-600'
                        : daysToExpiry <= 7
                          ? 'text-orange-600'
                          : 'text-green-600',
                    )}
                  >
                    (
                    {daysToExpiry < 0
                      ? `${Math.abs(daysToExpiry)} days ago`
                      : `${daysToExpiry} days`}
                    )
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Inventory & Pricing */}
        <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
          <Typography variant="h4">Inventory & Pricing</Typography>
          <div className="bg-white rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <Label htmlFor="quantity">Current Quantity</Label>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    step="1"
                    value={editedValues.current_quantity}
                    onChange={e =>
                      setEditedValues(prev => ({
                        ...prev,
                        current_quantity: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className={cn('w-20', editedValues.current_quantity < 0 && 'border-red-500')}
                  />
                  <span className="text-sm text-muted-foreground">units</span>
                </div>
              ) : (
                <Typography variant="p">{selectedBatch.current_quantity || 0} units</Typography>
              )}
            </div>

            <div className="flex justify-between items-center">
              <Label htmlFor="cost-price">Cost Price</Label>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm">€</span>
                  <Input
                    id="cost-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editedValues.cost_price}
                    onChange={e =>
                      setEditedValues(prev => ({
                        ...prev,
                        cost_price: formatCurrencyValue(Math.max(0, Number(e.target.value) || 0)),
                      }))
                    }
                    className={cn('w-24', editedValues.cost_price < 0 && 'border-red-500')}
                  />
                </div>
              ) : (
                <Typography variant="p">{formatCurrency(selectedBatch.cost_price || 0)}</Typography>
              )}
            </div>

            <div className="flex justify-between items-center">
              <Label htmlFor="selling-price">Selling Price</Label>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm">€</span>
                  <Input
                    id="selling-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editedValues.selling_price}
                    onChange={e =>
                      setEditedValues(prev => ({
                        ...prev,
                        selling_price: formatCurrencyValue(
                          Math.max(0, Number(e.target.value) || 0),
                        ),
                      }))
                    }
                    className={cn('w-24', editedValues.selling_price < 0 && 'border-red-500')}
                  />
                </div>
              ) : (
                <Typography variant="p">
                  {formatCurrency(selectedBatch.selling_price || 0)}
                </Typography>
              )}
            </div>

            {!isEditing &&
              (selectedBatch.current_selling_price || 0) !== (selectedBatch.selling_price || 0) && (
                <Typography variant="p" className="flex justify-between capitalize">
                  <span>Current Price</span>
                  <span>
                    {formatCurrency(selectedBatch.current_selling_price || 0)}
                    <span className="ml-1 text-xs">
                      (
                      {Math.round(
                        (((selectedBatch.selling_price || 0) -
                          (selectedBatch.current_selling_price || 0)) /
                          Math.max(selectedBatch.selling_price || 1, 0.01)) *
                          100,
                      )}
                      % off)
                    </span>
                  </span>
                </Typography>
              )}

            {!isEditing && (
              <Typography variant="p" className="flex justify-between capitalize">
                <span>Potential Loss</span>
                <span>{formatCurrency(selectedBatch.potential_loss_value || 0)}</span>
              </Typography>
            )}
          </div>
        </div>

        {/* Action History */}
        <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
          <Typography variant="h4">Action History</Typography>
          <div className="bg-white rounded-2xl p-4 space-y-3">
            {selectedBatch.last_action_type ? (
              <>
                <Typography variant="p" className="flex justify-between capitalize">
                  <span>Last Action</span>
                  <span>{selectedBatch.last_action_type.replace('_', ' ')}</span>
                </Typography>
                <Typography variant="p" className="flex justify-between capitalize">
                  <span>Last Action Time</span>
                  <span>{formatDateTime(selectedBatch.last_action_time || '')}</span>
                </Typography>
                {selectedBatch.last_action_quantity && (
                  <Typography variant="p" className="flex justify-between capitalize">
                    <span>Last Action Quantity</span>
                    <span>{selectedBatch.last_action_quantity || 0} units</span>
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="p" className="text-center py-2">
                No actions taken yet
              </Typography>
            )}

            <div className="border-t pt-3 space-y-2">
              <Typography variant="p" className="uppercase">
                Total Actions
              </Typography>
              <div>
                {(selectedBatch.total_sold_quantity || 0) > 0 && (
                  <Typography variant="p" className="flex justify-between capitalize">
                    <span>Sold:</span>
                    <span>{selectedBatch.total_sold_quantity || 0}</span>
                  </Typography>
                )}
                {(selectedBatch.total_discounted_quantity || 0) > 0 && (
                  <Typography variant="p" className="flex justify-between capitalize">
                    <span>Discounted:</span>
                    <span>{selectedBatch.total_discounted_quantity || 0}</span>
                  </Typography>
                )}
                {(selectedBatch.total_donated_quantity || 0) > 0 && (
                  <Typography variant="p" className="flex justify-between capitalize">
                    <span>Donated:</span>
                    <span>{selectedBatch.total_donated_quantity || 0}</span>
                  </Typography>
                )}
                {(selectedBatch.total_disposed_quantity || 0) > 0 && (
                  <Typography variant="p" className="flex justify-between capitalize">
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
                <span>{(selectedBatch.ai_recommendation || '').replace('_', ' ')}</span>
              </div>
              {selectedBatch.composite_score && (
                <div className="flex justify-between capitalize">
                  <span>Priority Score</span>
                  <span>{Math.round((selectedBatch.composite_score || 0) * 100)}%</span>
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
          className="rounded-full px-40 hidden sm:block"
        >
          Close
        </Button>
        <Button variant="subtleGray" onClick={onClose} className="rounded-full px-40 sm:hidden">
          Close
        </Button>
      </div>
    </div>
  )
}
