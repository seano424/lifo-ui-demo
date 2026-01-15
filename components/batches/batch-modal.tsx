'use client'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Typography } from '@/components/ui/typography'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import type { BatchWithProduct } from '@/lib/queries/batches'
import { useBatchActions } from '@/hooks/use-batches'
import type { Database } from '@/types/supabase'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  Hash,
  Clock,
  Edit3,
  Save,
  X,
} from 'lucide-react'

interface BatchModalProps {
  isOpen: boolean
  onClose: () => void
  batch: TodoItem | BatchWithProduct | null
  currencySymbol?: string
}

export function BatchModal({ isOpen, onClose, batch, currencySymbol = '€' }: BatchModalProps) {
  const { updateBatch, isUpdating } = useBatchActions()

  const [isEditing, setIsEditing] = useState(false)
  const [editedValues, setEditedValues] = useState({
    expiry_date: '',
    cost_price: 0,
    selling_price: 0,
  })

  if (!batch) {
    return null
  }

  // Helper to get product name - handle both TodoItem and BatchWithProduct
  const getProductName = () => {
    if ('product_name' in batch) {
      return batch.product_name || 'Unnamed Product'
    }
    if ('products' in batch && batch.products) {
      return batch.products.name || 'Unnamed Product'
    }
    return 'Unnamed Product'
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatCurrency = (value: number) => `${currencySymbol}${value.toFixed(2)}`

  const calculateDaysToExpiry = () => {
    if (!batch.expiry_date) return null
    const today = new Date()
    const expiryDate = new Date(batch.expiry_date)
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysToExpiry = calculateDaysToExpiry()

  const getExpiryContext = () => {
    if (daysToExpiry === null) return 'No expiry date'
    if (daysToExpiry < 0) return `Expired ${Math.abs(daysToExpiry)} days ago`
    if (daysToExpiry === 0) return 'Expires today'
    if (daysToExpiry === 1) return 'Expires tomorrow'
    return `${daysToExpiry} days until expiry`
  }

  const handleEditClick = () => {
    setEditedValues({
      expiry_date: batch.expiry_date ? new Date(batch.expiry_date).toISOString().split('T')[0] : '',
      cost_price: batch.cost_price || 0,
      selling_price: batch.selling_price || 0,
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    try {
      updateBatch({
        batchId: batch.batch_id || '',
        updates: {
          expiry_date: editedValues.expiry_date,
          cost_price: editedValues.cost_price,
          selling_price: editedValues.selling_price,
        } as Database['inventory']['Tables']['batches']['Update'],
      })
      setIsEditing(false)
      toast.success('Batch updated successfully')
    } catch (error) {
      console.error('Failed to update batch:', error)
      toast.error('Failed to update batch')
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  // Get current quantity - handle both TodoItem and BatchWithProduct types
  const currentQuantity = 'current_quantity' in batch ? batch.current_quantity : 0
  const batchNumber = 'batch_number' in batch ? batch.batch_number : 'N/A'

  return (
    <BottomSheet
      variant="fullHeight"
      isOpen={isOpen}
      onClose={onClose}
      titleElement={
        <div className="flex flex-col gap-2">
          <Typography className="font-black" variant="h3">
            {getProductName()}
          </Typography>
          <div className="flex items-center divide-x divide-muted-foreground/10">
            <Typography variant="small" color="muted" className="pr-2 font-semibold">
              {getExpiryContext()}
            </Typography>
            <Typography variant="small" color="muted" className="pl-2">
              {currentQuantity} units
            </Typography>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full max-h-[90vh]">
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-32">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-muted/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <Typography variant="small" color="muted">
                  Current Stock
                </Typography>
              </div>
              <Typography variant="h3">{currentQuantity || 0}</Typography>
            </div>
            <div className="bg-muted/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <Typography variant="small" color="muted">
                  Value
                </Typography>
              </div>
              <Typography variant="h3">
                {formatCurrency((currentQuantity || 0) * (batch.selling_price || 0))}
              </Typography>
            </div>
          </div>

          {/* Batch Details */}
          <div className="flex flex-col gap-4">
            {/* Edit Actions */}
            {!isEditing ? (
              <Button
                variant="outline"
                onClick={handleEditClick}
                className="w-full rounded-2xl flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit Batch Details
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="flex-1 rounded-2xl"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isUpdating} className="flex-1 rounded-2xl">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            )}

            {/* Details Section */}
            <div className="flex flex-col divide-y divide-muted-foreground/10 bg-muted/30 rounded-2xl px-4">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <Typography variant="small" color="muted">
                    Batch Number
                  </Typography>
                </div>
                <Typography variant="small">{batchNumber}</Typography>
              </div>

              {/* Expiry Date - Editable */}
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Typography variant="small" color="muted">
                    Expiry Date
                  </Typography>
                </div>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedValues.expiry_date}
                    onChange={e =>
                      setEditedValues(prev => ({
                        ...prev,
                        expiry_date: e.target.value,
                      }))
                    }
                    className="w-40 h-8 text-sm"
                  />
                ) : (
                  <Typography variant="small">{formatDate(batch.expiry_date)}</Typography>
                )}
              </div>

              {/* Cost Price - Editable */}
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  <Typography variant="small" color="muted">
                    Cost Price
                  </Typography>
                </div>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={editedValues.cost_price}
                    onChange={e =>
                      setEditedValues(prev => ({
                        ...prev,
                        cost_price: Number(e.target.value),
                      }))
                    }
                    className="w-32 h-8 text-sm"
                  />
                ) : (
                  <Typography variant="small">{formatCurrency(batch.cost_price || 0)}</Typography>
                )}
              </div>

              {/* Selling Price - Editable */}
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <Typography variant="small" color="muted">
                    Selling Price
                  </Typography>
                </div>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={editedValues.selling_price}
                    onChange={e =>
                      setEditedValues(prev => ({
                        ...prev,
                        selling_price: Number(e.target.value),
                      }))
                    }
                    className="w-32 h-8 text-sm"
                  />
                ) : (
                  <Typography variant="small">
                    {formatCurrency(batch.selling_price || 0)}
                  </Typography>
                )}
              </div>

              {/* Created At */}
              {'created_at' in batch && batch.created_at && (
                <div className="flex justify-between items-center py-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Typography variant="small" color="muted">
                      Created
                    </Typography>
                  </div>
                  <Typography variant="small">{formatDate(batch.created_at)}</Typography>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
