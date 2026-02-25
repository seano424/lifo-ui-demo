'use client'

import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { UntrackedAlertProps } from './types'
import { useBatchActions } from '@/hooks/use-batches'
import { useState, useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface BatchRow {
  id: number
  date: string
  qty: string
}

export function UntrackedAlert({
  count,
  productId,
  storeQuantity,
  autoExpand = false,
  costPrice,
  sellingPrice,
}: UntrackedAlertProps) {
  const [showForm, setShowForm] = useState(autoExpand)
  const [rows, setRows] = useState<BatchRow[]>([{ id: 1, date: '', qty: '' }])
  const firstInputRef = useRef<HTMLInputElement>(null)
  const { isCreating, createMutation } = useBatchActions()

  useEffect(() => {
    if (showForm && firstInputRef.current) {
      firstInputRef.current.focus()
    }
  }, [showForm])

  if (count <= 0) return null

  const today = new Date().toISOString().split('T')[0]

  const trackedQty = storeQuantity - count
  const progressPct = storeQuantity > 0 ? Math.round((trackedQty / storeQuantity) * 100) : 0

  const totalAssigned = rows.reduce((sum, r) => sum + (parseInt(r.qty, 10) || 0), 0)
  const remaining = count - totalAssigned
  const hasAnyDate = rows.some(r => r.date)
  const datedRows = rows.filter(r => r.date)

  const updateRow = (id: number, field: 'date' | 'qty', value: string) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const handleSubmit = async () => {
    if (!hasAnyDate) {
      toast.error('Please select at least one expiry date')
      return
    }

    const rowsToCreate = datedRows.map(r => ({
      date: r.date,
      quantity: parseInt(r.qty, 10) || (datedRows.length === 1 ? count : 0),
    }))

    for (const { date, quantity } of rowsToCreate) {
      if (date < today) {
        toast.error('Expiry date must be today or in the future')
        return
      }
      if (quantity <= 0) {
        toast.error('Quantity must be at least 1')
        return
      }
    }

    const totalQty = rowsToCreate.reduce((s, r) => s + r.quantity, 0)
    if (totalQty > count) {
      toast.error(`Total quantity (${totalQty}) exceeds untracked units (${count})`)
      return
    }

    try {
      await Promise.all(
        rowsToCreate.map(({ date, quantity }) =>
          createMutation.mutateAsync({
            product_id: productId,
            batch_number: `BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            expiry_date: date,
            initial_quantity: quantity,
            current_quantity: quantity,
            cost_price: (costPrice ?? sellingPrice) as number,
            selling_price: (sellingPrice ?? costPrice) as number,
            status: 'active',
            store_id: '',
          }),
        ),
      )

      toast.success(
        rowsToCreate.length === 1
          ? `Batch created with ${totalQty} units`
          : `${rowsToCreate.length} batches created (${totalQty} units)`,
      )
      setRows([{ id: 1, date: '', qty: '' }])
      setShowForm(false)
    } catch {
      toast.error('Failed to create batch')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main row: headline + Add dates button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <Typography variant="p" className="font-semibold">
            {count} units missing expiry dates
          </Typography>
          <Typography variant="small" color="muted">
            Cannot be tracked until dates are added
          </Typography>
        </div>
        <Button
          variant="subtleGray"
          size="xs"
          className="shrink-0 rounded-lg"
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? 'Close' : 'Add dates'}
        </Button>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-lime-400/20 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <Typography variant="extraSmall" color="muted">
            {trackedQty} of {storeQuantity} units tracked
          </Typography>
          <Typography variant="extraSmall" className="font-medium">
            {progressPct}%
          </Typography>
        </div>
      </div>

      {/* Expandable form */}
      {showForm && (
        <div className="flex flex-col gap-3 pt-2 border-t border-border">
          {/* Batch rows */}
          <div className="space-y-2">
            {rows.map((row, idx) => (
              <div key={row.id} className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-sm text-foreground">Expiry date</Label>
                  <Input
                    ref={idx === 0 ? firstInputRef : undefined}
                    type="date"
                    value={row.date}
                    min={today}
                    onChange={e => updateRow(row.id, 'date', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-sm text-foreground">Quantity</Label>
                  <Input
                    type="number"
                    value={row.qty}
                    onChange={e => updateRow(row.id, 'qty', e.target.value)}
                    placeholder={rows.length === 1 ? String(count) : '0'}
                    min="1"
                    max={count}
                    className="w-full"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Remaining count + submit */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 border-border')}>
              {remaining === 0 ? (
                <Typography variant="small" color="muted">
                  All units assigned
                </Typography>
              ) : remaining < 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <Typography className="font-medium text-sm" as="span">
                    {Math.abs(remaining)} over
                  </Typography>
                </>
              ) : (
                <Typography variant="small" color="muted">
                  {remaining} unassigned
                </Typography>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                className="rounded-lg"
                variant="subtleGray"
                size="xs"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="subtleTertiary"
                className="rounded-lg"
                onClick={handleSubmit}
                disabled={!hasAnyDate || isCreating}
                size="xs"
              >
                Add batch
              </Button>
            </div>
          </div>

          <Typography variant="extraSmall" color="muted" className="text-center">
            Quantity defaults to all {count} untracked units if left blank.
          </Typography>
        </div>
      )}
    </div>
  )
}
