'use client'

import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { BatchRowProps } from './types'
import { parseISODateAsLocal } from '@/lib/utils/date-conversion'
import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TrashIcon } from 'lucide-react'

export function BatchRow({
  batch,
  isEditing,
  maxQuantity,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
}: BatchRowProps) {
  const [editedDate, setEditedDate] = useState(batch.expiry_date || '')
  const [editedQty, setEditedQty] = useState(
    batch.current_quantity != null ? String(batch.current_quantity) : '',
  )
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (isEditing) {
      setEditedDate(batch.expiry_date || '')
      setEditedQty(batch.current_quantity != null ? String(batch.current_quantity) : '')
      setConfirmDelete(false)
    }
  }, [isEditing, batch.expiry_date, batch.current_quantity])

  const daysToExpiry = calculateDaysToExpiry(batch.expiry_date)

  const formatDate = (date: string | null) => {
    if (!date) return 'No expiry date'
    const localDate = parseISODateAsLocal(date)
    return localDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleSave = () => {
    const updates: { expiry_date?: string; current_quantity?: number } = {}

    if (editedDate !== batch.expiry_date) {
      updates.expiry_date = editedDate
    }

    const newQty = parseInt(editedQty, 10)

    if (Number.isNaN(newQty) || newQty < 0) {
      toast.error('Quantity must be a positive number')
      return
    }

    if (maxQuantity != null && newQty > maxQuantity) {
      toast.error(`Quantity cannot exceed ${maxQuantity} (store total would be exceeded)`)
      return
    }

    if (newQty !== batch.current_quantity) {
      updates.current_quantity = newQty
    }

    if (Object.keys(updates).length > 0) {
      onSave(updates)
    } else {
      onCancel()
    }
  }

  const handleDelete = () => {
    onDelete(batch.batch_id)
    onCancel()
  }

  const isExpired = daysToExpiry != null && daysToExpiry < 0

  return (
    <>
      <div
        onClick={isEditing ? onCancel : isExpired ? undefined : onStartEdit}
        onKeyDown={e => e.key === 'Enter' && onStartEdit()}
        className={cn(
          'flex items-center gap-3 group',
          // 'bg-muted rounded-lg py-2 px-3',
          !isExpired && 'cursor-pointer',
        )}
      >
        {/* Batch info */}
        <div
          className={cn(
            'flex-1 min-w-0 flex flex-col items-baseline gap-1',
            isExpired && 'opacity-50',
          )}
        >
          <Typography variant="p">
            {batch.current_quantity || 0} {daysToExpiry !== null && daysToExpiry < 0 && 'expired'}{' '}
            {daysToExpiry !== null && daysToExpiry <= 3 && daysToExpiry >= 0 && 'expiring soon'}{' '}
            {daysToExpiry !== null && daysToExpiry > 3 && 'expiring later'}{' '}
          </Typography>
          <Typography variant="small" color="muted">
            {formatDate(batch.expiry_date)}
          </Typography>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 shrink-0">
          <DaysLeftLabel days={daysToExpiry} />
        </div>
      </div>

      {!isExpired && isEditing && (
        <div className="flex flex-col gap-4 border px-6 rounded-xl py-4">
          {/* Date + qty grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-sm text-foreground">Expiry date</Label>
              <Input
                type="date"
                value={editedDate}
                onChange={e => setEditedDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-sm text-foreground">Quantity</Label>
              <Input
                type="number"
                value={editedQty}
                onChange={e => setEditedQty(e.target.value)}
                min="1"
                max={maxQuantity ?? undefined}
                className="w-full"
              />
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Delete flow */}
            {confirmDelete ? (
              <div className="flex items-center w-full justify-between">
                <Typography variant="small">Confirm?</Typography>
                <div>
                  <Button variant="subtleDestructive" size="sm" onClick={handleDelete}>
                    Yes, remove
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    No, cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="subtleDestructive"
                size="sm"
                className="hover:opacity-100 transition-opacity border opacity-40"
                onClick={() => setConfirmDelete(true)}
              >
                <TrashIcon className="w-4 h-4" />
                Remove batch
              </Button>
            )}

            {/* Save / Cancel */}
            {!confirmDelete && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
                <Button variant="black" size="sm" onClick={handleSave}>
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function calculateDaysToExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = parseISODateAsLocal(expiryDate)
  const diffTime = expiry.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function DaysLeftLabel({ days }: { days: number | null }) {
  if (days === null) {
    return (
      <Badge size="sm" variant={'muted'}>
        No date
      </Badge>
    )
  }

  if (days < 0) {
    return (
      <Badge size="sm" variant={'muted'}>
        Expired
      </Badge>
    )
  }

  if (days === 0) {
    return (
      <Badge size="sm" variant={'danger'}>
        Today
      </Badge>
    )
  }

  if (days <= 3) {
    return (
      <Badge size="sm" variant={'danger'}>
        {days}d left
      </Badge>
    )
  }

  return (
    <Badge size="sm" variant={'success'}>
      {days}d left
    </Badge>
  )
}
