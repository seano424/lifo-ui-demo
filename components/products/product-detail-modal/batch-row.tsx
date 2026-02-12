'use client'

import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { BatchRowProps } from './types'
import { parseISODateAsLocal } from '@/lib/utils/date-conversion'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

export function BatchRow({
  batch,
  isHighlighted,
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

  const barWidth = getUrgencyBarWidth(daysToExpiry)

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

  // Edit mode UI
  if (isEditing) {
    return (
      <div className="px-5 py-3 bg-muted/50 border-y border-border">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
              Expiry date
            </label>
            <Input type="date" value={editedDate} onChange={e => setEditedDate(e.target.value)} />
          </div>
          <div className="w-24">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
              Qty
            </label>
            <Input
              type="number"
              value={editedQty}
              onChange={e => setEditedQty(e.target.value)}
              min="0"
            />
          </div>
          <div className="flex items-end gap-2 pb-[1px]">
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Display mode UI
  return (
    <div
      onClick={onStartEdit}
      onKeyDown={e => e.key === 'Enter' && onStartEdit()}
      className={cn(
        'group px-5 py-3 flex items-center cursor-pointer transition-colors border-l-2',
        isHighlighted
          ? 'bg-muted/50 border-l-foreground'
          : 'hover:bg-muted/30 border-l-transparent',
      )}
    >
      {/* Urgency micro-bar */}
      <div className="w-8 mr-3 flex flex-col items-center">
        <div className="w-1 h-6 bg-muted rounded-full overflow-hidden relative">
          <div
            className={cn(
              'absolute bottom-0 w-full rounded-full transition-all',
              getUrgencyColor(daysToExpiry),
            )}
            style={{ height: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Batch info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <Typography variant="p" className="font-medium">
            {batch.current_quantity || 0} units
          </Typography>
          <span className="text-xs text-muted-foreground">·</span>
          <Typography variant="small" className="text-muted-foreground">
            {formatDate(batch.expiry_date)}
          </Typography>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Typography variant="small" className="text-muted-foreground">
            {batch.batch_number || 'No batch number'}
          </Typography>
          <span className="text-xs text-muted-foreground">·</span>
          <Typography variant="small" className="text-muted-foreground">
            {formatCurrency(batch.selling_price || 0)} each
          </Typography>
        </div>
      </div>

      {/* Days left + status */}
      <div className="flex items-center gap-3 ml-4">
        <DaysLeftLabel days={daysToExpiry} />
        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
          {batch.status}
        </span>
        <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors text-xs">
          Edit →
        </span>
      </div>
    </div>
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
function getUrgencyBarWidth(days: number | null): number {
  if (days === null) return 15
  if (days <= 0) return 100 // Expired
  if (days <= 3) return 85 // Critical
  if (days <= 7) return 55 // High
  if (days <= 14) return 35 // Medium
  return 15 // Low
}

// Helper: Get urgency color class
function getUrgencyColor(days: number | null): string {
  if (days === null) return 'bg-muted-foreground/30'
  if (days <= 0) return 'bg-destructive'
  if (days <= 3) return 'bg-destructive/80'
  if (days <= 7) return 'bg-orange-500'
  if (days <= 14) return 'bg-yellow-500'
  return 'bg-muted-foreground/50'
}

// Component: Days left label with styling
function DaysLeftLabel({ days }: { days: number | null }) {
  if (days === null) {
    return <span className="text-xs text-muted-foreground">No date</span>
  }

  if (days < 0) {
    return <span className="text-xs font-semibold text-destructive">Expired</span>
  }

  if (days === 0) {
    return <span className="text-xs font-semibold text-destructive">Today</span>
  }

  // Style by urgency
  const weight = days <= 3 ? 'font-semibold' : days <= 7 ? 'font-medium' : 'font-normal'
  const color =
    days <= 3 ? 'text-foreground' : days <= 7 ? 'text-foreground/80' : 'text-muted-foreground'

  return <span className={cn('text-xs', weight, color)}>{days}d left</span>
}
