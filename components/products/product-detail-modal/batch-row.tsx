'use client'

import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { BatchRowProps } from './types'
import { parseISODateAsLocal } from '@/lib/utils/date-conversion'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export function BatchRow({
  batch,
  // isHighlighted,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  currencySymbol,
}: BatchRowProps) {
  const [editedDate, setEditedDate] = useState(batch.expiry_date || '')
  const [editedQty, setEditedQty] = useState(String(batch.current_quantity || 0))

  // Reset edited values when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditedDate(batch.expiry_date || '')
      setEditedQty(String(batch.current_quantity || 0))
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

  const formatCurrency = (value: number) => `${currencySymbol}${value.toFixed(2)}`

  // const barWidth = getUrgencyBarWidth(daysToExpiry)

  const handleSave = () => {
    const updates: { expiry_date?: string; current_quantity?: number } = {}

    if (editedDate !== batch.expiry_date) {
      updates.expiry_date = editedDate
    }

    const newQty = parseInt(editedQty, 10)
    if (!Number.isNaN(newQty) && newQty !== batch.current_quantity) {
      updates.current_quantity = newQty
    }

    // Only save if there are actual changes
    if (Object.keys(updates).length > 0) {
      onSave(updates)
    } else {
      onCancel()
    }
  }
  // Display mode UI
  return (
    <>
      <div
        onClick={isEditing ? onCancel : onStartEdit}
        onKeyDown={e => e.key === 'Enter' && onStartEdit()}
        className={cn(
          'group flex gap-4 items-center cursor-pointer transition-colors',
          daysToExpiry && daysToExpiry < 0 ? 'opacity-50' : '',
        )}
      >
        {/* Urgency micro-bar */}
        {/* <div className="flex flex-col items-center">
          <div className="w-2 h-6 bg-muted rounded-full overflow-hidden relative">
            <div
              className={cn(
                'absolute bottom-0 w-full rounded-full transition-all',
                getUrgencyColor(daysToExpiry),
              )}
              style={{ height: `${barWidth}%` }}
            />
          </div>
        </div> */}

        {/* Batch info */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <Typography variant="small" className="font-medium">
              {batch.current_quantity || 0} units
            </Typography>

            <Typography variant="extraSmall" color="muted">
              {formatCurrency(batch.selling_price || 0)} each
            </Typography>
          </div>

          <Typography variant="small" color="muted">
            {formatDate(batch.expiry_date)}
          </Typography>
        </div>

        {/* Days left */}
        <div className="flex items-center gap-3">
          <DaysLeftLabel days={daysToExpiry} />
          <Typography variant="extraSmall" color="muted">
            Edit →
          </Typography>
        </div>
      </div>

      {isEditing && (
        <div className="pb-12 px-2 pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-1 justify-between">
              <div className="flex flex-col gap-1">
                <Label className="text-sm text-foreground">Expiry date</Label>
                <Input
                  type="date"
                  value={editedDate}
                  onChange={e => setEditedDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-sm text-foreground">Quantity</Label>
                <Input
                  type="number"
                  value={editedQty}
                  onChange={e => setEditedQty(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            <div className="flex gap-1 w-full justify-end items-center flex-col">
              <Button size="xs" className="w-full" onClick={onCancel}>
                Cancel
              </Button>
              <Button size="xs" variant="black" className="w-full" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Helper: Calculate days until expiry
function calculateDaysToExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = parseISODateAsLocal(expiryDate)
  const diffTime = expiry.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Helper: Get urgency bar width based on days
// function getUrgencyBarWidth(days: number | null): number {
//   if (days === null) return 15
//   if (days <= 0) return 100 // Expired
//   if (days <= 3) return 85 // Critical
//   if (days <= 7) return 55 // High
//   if (days <= 14) return 35 // Medium
//   return 15 // Low
// }

// Helper: Get urgency color class
// function getUrgencyColor(days: number | null): string {
//   if (days === null) return 'bg-muted-foreground/30'
//   if (days <= 0) return 'bg-destructive'
//   if (days <= 3) return 'bg-destructive/80'
//   if (days <= 7) return 'bg-primary-500'
//   if (days <= 14) return 'bg-primary-500'
//   return 'bg-muted-foreground/50'
// }

// Component: Days left label with styling
function DaysLeftLabel({ days }: { days: number | null }) {
  if (days === null) {
    return <Badge variant="mutedRounded">No date</Badge>
  }

  if (days < 0) {
    return <Badge variant="destructiveRounded">Expired</Badge>
  }

  if (days === 0) {
    return <Badge variant="destructiveRounded">Today</Badge>
  }

  return (
    <Badge variant={days <= 3 ? 'mutedRounded' : days <= 7 ? 'mutedRounded' : 'plainRounded'}>
      {days}d left
    </Badge>
  )
}
