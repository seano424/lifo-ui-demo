'use client'

import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { UntrackedAlertProps } from './types'
import { useBatchActions } from '@/hooks/use-batches'
import { useState, useEffect, useRef } from 'react'
import { AlertCircle, ChevronRight, Plus, Minus, Check, AlertTriangle } from 'lucide-react'
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
  autoExpand = false,
  costPrice,
  sellingPrice,
}: UntrackedAlertProps) {
  const [expanded, setExpanded] = useState(autoExpand)
  const [rows, setRows] = useState<BatchRow[]>([{ id: 1, date: '', qty: '' }])
  const firstInputRef = useRef<HTMLInputElement>(null)
  const { createBatch, isCreating } = useBatchActions()

  useEffect(() => {
    if (expanded && firstInputRef.current) {
      firstInputRef.current.focus()
    }
  }, [expanded])

  if (count <= 0) return null

  const today = new Date().toISOString().split('T')[0]

  const totalAssigned = rows.reduce((sum, r) => sum + (parseInt(r.qty) || 0), 0)
  const remaining = count - totalAssigned
  const hasAnyDate = rows.some(r => r.date)
  const datedRows = rows.filter(r => r.date)

  const addRow = () => {
    setRows(prev => [...prev, { id: Date.now(), date: '', qty: '' }])
  }

  const updateRow = (id: number, field: 'date' | 'qty', value: string) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const removeRow = (id: number) => {
    if (rows.length > 1) setRows(prev => prev.filter(r => r.id !== id))
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
      if (quantity <= 0 || quantity > count) {
        toast.error(`Quantity must be between 1 and ${count}`)
        return
      }
    }

    try {
      for (const { date, quantity } of rowsToCreate) {
        const batchNumber = `BATCH-${Date.now()}-${Math.random().toString(36).substring(7).t()}`
        createBatch({
          product_id: productId,
          batch_number: batchNumber,
          expiry_date: date,
          initial_quantity: quantity,
          current_quantity: quantity,
          cost_price: costPrice ?? sellingPrice ?? undefined,
          selling_price: sellingPrice ?? costPrice ?? undefined,
          status: 'active',
          store_id: '',
        } as Parameters<typeof createBatch>[0])
      }

      const totalQty = rowsToCreate.reduce((s, r) => s + r.quantity, 0)
      toast.success(
        rowsToCreate.length === 1
          ? `Batch created with ${totalQty} units`
          : `${rowsToCreate.length} batches created (${totalQty} units)`,
      )
      setRows([{ id: 1, date: '', qty: '' }])
    } catch {
      toast.error('Failed to create batch')
    }
  }

  return (
    <div className="space-y-3">
      {/* Collapsed pill banner */}
      {!expanded && (
        <button type="button" onClick={() => setExpanded(true)} className="w-full group">
          <div className="flex items-center gap-3.5 px-4 py-3.5 rounded-3xl bg-background border border-primary-300 hover:border-primary-200 hover:shadow-sm transition-all duration-200">
            {/* Text */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                {/* <div className="size-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Typography variant="extraSmall" color="white" className="font-bold"></Typography>
                </div> */}
                <Typography variant="h5" className="font-semibold">
                  {count} units need expiry dates
                </Typography>
              </div>
            </div>

            {/* Icon bubble */}
            <div className="size-9 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
              <Plus className="size-5 text-white" />
            </div>
          </div>
        </button>
      )}

      {/* Expanded card */}
      {expanded && (
        <div className="rounded-3xl bg-background border border-primary-300 overflow-hidden">
          {/* Header — click to collapse */}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 transition-colors"
          >
            {/* Text */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                {/* <div className="size-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Typography variant="extraSmall" color="white" className="font-bold"></Typography>
                </div> */}
                <Typography variant="h5" className="font-semibold">
                  {count} units need expiry dates
                </Typography>
              </div>
            </div>

            {/* Icon bubble */}
            <div className="size-9 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
              <Plus className="size-5 text-white" />
            </div>
          </button>

          {/* Form area */}
          <div className="p-4 border-t border-primary-300">
            {/* Column headers */}
            <div className="flex items-center gap-3 mb-2 px-1">
              <Typography variant="extraSmall" color="muted" className="flex-1">
                Expiry date
              </Typography>
              <Typography variant="extraSmall" color="muted">
                Quantity
              </Typography>
            </div>

            {/* Batch rows */}
            <div className="space-y-2">
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between w-full rounded-lg gap-3"
                >
                  {/* Date input */}
                  <Input
                    ref={idx === 0 ? firstInputRef : undefined}
                    type="date"
                    value={row.date}
                    min={today}
                    size="sm"
                    onChange={e => updateRow(row.id, 'date', e.target.value)}
                    className="flex-1 rounded-lg select-none border border-primary-100/60"
                  />
                  <div>
                    {/* Quantity input */}
                    <Input
                      type="number"
                      value={row.qty}
                      onChange={e => updateRow(row.id, 'qty', e.target.value)}
                      placeholder={rows.length === 1 ? String(count) : '0'}
                      min="1"
                      max={count}
                      size="sm"
                      className="w-20 text-center rounded-lg border border-primary-100/60 select-none"
                    />
                  </div>

                  {/* Remove row */}
                  {/* {rows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="w-8 h-8 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors shrink-0"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="w-8" />
                  )} */}
                </div>
              ))}
            </div>

            {/* Add another row */}
            {/* <button
              type="button"
              onClick={addRow}
              className="mt-2.5 flex items-center gap-2 px-1 py-1 hover:opacity-80 transition-opacity"
            >
              <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <Plus className="w-3 h-3 text-primary" />
              </div>
              <Typography variant="small" color="primary" className="font-medium">
                Add another batch
              </Typography>
            </button> */}

            {/* Remaining count + submit */}
            <div className="mt-4 py-2 flex items-center justify-between gap-3">
              {/* Remaining pill */}
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary-300',
                  // remaining === 0
                  //   ? 'bg-secondary-50 text-secondary border-secondary-100'
                  //   : remaining < 0
                  //     ? 'bg-primary-50 text-primary border-primary-100'
                  //     : 'bg-muted text-muted-foreground border-border',
                )}
              >
                {remaining === 0 ? (
                  <Typography className="font-medium text-sm" as="span">
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
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                    <Typography className="font-medium text-sm" as="span">
                      {remaining} unassigned
                    </Typography>
                  </>
                )}
              </div>

              {/* Submit button */}
              <Button
                variant="secondary"
                onClick={handleSubmit}
                disabled={!hasAnyDate || isCreating}
                size="sm"
              >
                Add batch
              </Button>
            </div>

            {/* Helper text */}
            <Typography variant="extraSmall" color="muted" className="mt-3 text-center block">
              Quantity defaults to all {count} untracked units if left blank.
            </Typography>
          </div>
        </div>
      )}
    </div>
  )
}
