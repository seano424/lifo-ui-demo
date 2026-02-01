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
import { parseISODateAsLocal } from '@/lib/utils/date-conversion'

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
    // parseISODateAsLocal now handles both date-only and timestamp formats
    const localDate = parseISODateAsLocal(date)
    return localDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatCurrency = (value: number) => `${currencySymbol}${value.toFixed(2)}`

  const calculateDaysToExpiry = () => {
    if (!batch.expiry_date) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiryDate = parseISODateAsLocal(batch.expiry_date)
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
      // Keep date string as-is since it's already in YYYY-MM-DD format
      expiry_date: batch.expiry_date || '',
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
      className="min-w-xl"
      isOpen={isOpen}
      onClose={onClose}
      titleElement={
        <div className="flex flex-col gap-2 py-4">
          <Typography className="" variant="h3">
            {getProductName()}
          </Typography>
          <div className="flex items-center divide-x divide-muted-foreground/10">
            <Typography variant="p" className="pr-2 ">
              {getExpiryContext()}
            </Typography>
            <Typography variant="p" className="pl-2">
              {currentQuantity} units
            </Typography>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full max-h-[90vh]">
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-muted/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Typography variant="p">Current Stock</Typography>
              </div>
              <Typography variant="h3">{currentQuantity || 0}</Typography>
            </div>
            <div className="bg-muted/30 rounded-2xl p-4 text-right justify-end">
              <div className="flex items-center justify-end gap-2 mb-2">
                <Typography variant="p">Value</Typography>
              </div>
              <Typography variant="h3">
                {formatCurrency((currentQuantity || 0) * (batch.selling_price || 0))}
              </Typography>
            </div>
          </div>

          {/* Batch Details */}
          <div className="flex flex-col gap-4">
            {/* Details Section */}
            <div className="flex flex-col bg-muted/30 rounded-2xl px-4">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-2">
                  <Typography variant="p">Batch Number</Typography>
                </div>
                <Typography variant="p">{batchNumber}</Typography>
              </div>

              {/* Expiry Date - Editable */}
              <div className="flex justify-between items-center py-4 gap-2">
                <div className="flex flex-1 items-center gap-2">
                  <Typography variant="p" className="text-nowrap">
                    Expiry Date
                  </Typography>
                </div>
                {isEditing ? (
                  <div>
                    <Input
                      type="date"
                      size="sm"
                      className="w-40"
                      value={editedValues.expiry_date}
                      onChange={e =>
                        setEditedValues(prev => ({
                          ...prev,
                          expiry_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                ) : (
                  <Typography variant="p">{formatDate(batch.expiry_date)}</Typography>
                )}
              </div>

              {/* Cost Price - Editable */}
              <div className="flex justify-between items-center py-4 gap-2">
                <div className="flex items-center gap-2">
                  <Typography variant="p" className="text-nowrap">
                    Cost Price
                  </Typography>
                </div>
                {isEditing ? (
                  <div>
                    <Input
                      size="sm"
                      className="w-40"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedValues.cost_price}
                      onChange={e =>
                        setEditedValues(prev => ({
                          ...prev,
                          cost_price: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                ) : (
                  <Typography variant="p">{formatCurrency(batch.cost_price || 0)}</Typography>
                )}
              </div>

              {/* Selling Price - Editable */}
              <div className="flex justify-between items-center py-4 gap-2">
                <div className="flex items-center gap-2">
                  <Typography variant="p" className="text-nowrap">
                    Selling Price
                  </Typography>
                </div>
                {isEditing ? (
                  <div>
                    <Input
                      size="sm"
                      className="w-40"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedValues.selling_price}
                      onChange={e =>
                        setEditedValues(prev => ({
                          ...prev,
                          selling_price: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                ) : (
                  <Typography variant="p">{formatCurrency(batch.selling_price || 0)}</Typography>
                )}
              </div>

              {/* Created At */}
              {'created_at' in batch && batch.created_at && (
                <div className="flex justify-between items-center py-4 gap-2">
                  <div className="flex items-center gap-2">
                    <Typography variant="p" className="text-nowrap">
                      Created
                    </Typography>
                  </div>
                  <Typography variant="p">{formatDate(batch.created_at)}</Typography>
                </div>
              )}
            </div>
            <div className="py-8">
              {/* Edit Actions */}
              {!isEditing ? (
                <Button
                  variant="subtle"
                  onClick={handleEditClick}
                  className="w-full rounded-2xl flex items-center gap-2"
                  size="lg"
                >
                  Edit Batch Details
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="gray"
                    onClick={handleCancel}
                    disabled={isUpdating}
                    className="flex-1 rounded-2xl"
                    size="lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="subtle"
                    onClick={handleSave}
                    disabled={isUpdating}
                    className="flex-1 rounded-2xl"
                    size="lg"
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
