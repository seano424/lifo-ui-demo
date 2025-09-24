'use client'

import { Button } from '@/components/ui/button'
import { InputSlider } from '@/components/ui/input-slider'
import { Typography } from '@/components/ui/typography'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { useBatchActionRPC } from '@/hooks/use-batch-actions-rpc'
import { useEffect, useState } from 'react'

interface SoldTabProps {
  selectedBatch: TodoItem
  onClose: () => void
}

// Sale timing options
const SALE_TIMING_OPTIONS = [
  { id: 'just-now', label: 'Just now' },
  { id: 'today', label: 'Earlier today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this-week', label: 'This week' },
]

export function SoldTab({ selectedBatch, onClose }: SoldTabProps) {
  const { executeSold, isMarkingSold } = useBatchActionRPC()

  // Sold tab state
  const [soldQuantity, setSoldQuantity] = useState(selectedBatch.current_quantity || 0)
  const [isSoldSelectAll, setIsSoldSelectAll] = useState(true)
  const [soldTiming, setSoldTiming] = useState('just-now')

  // Update quantity when batch changes or select all toggles
  useEffect(() => {
    if (isSoldSelectAll) {
      setSoldQuantity(selectedBatch.current_quantity || 0)
    }
  }, [selectedBatch.current_quantity, isSoldSelectAll])

  // Handle quantity slider change
  const handleQuantityChange = (value: number) => {
    setSoldQuantity(value)
    setIsSoldSelectAll(value === selectedBatch.current_quantity)
  }

  // Handle timing selection
  const handleTimingChange = (timing: string) => {
    setSoldTiming(timing)
  }

  // Handle sold execution
  const handleSoldAction = async () => {
    try {
      const params = {
        batchId: selectedBatch.batch_id || '',
        quantity: soldQuantity,
        notes: `Marked ${soldQuantity} units as sold (${SALE_TIMING_OPTIONS.find(t => t.id === soldTiming)?.label}) - ${selectedBatch.ai_recommendation || ''}`,
      }

      await executeSold(params)

      // Success - close the modal
      onClose()
    } catch (error) {
      console.error('[SoldTab] Sold action failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        batchId: selectedBatch.batch_id,
        quantity: soldQuantity,
      })
    }
  }

  return (
    <div className="flex flex-col h-full bg-muted">
      {/* content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-100 scrollbar-track-transparent flex flex-col divide-y-4 divide-white">
        {/* Sale Timing Options */}
        <div className="flex flex-col gap-4 px-8 py-4 flex-1 justify-center">
          <Typography variant="p" className="xs:text-lg">
            When did this sell?
          </Typography>
          <div className="grid grid-cols-2 gap-2 bg-white rounded-2xl p-4">
            {SALE_TIMING_OPTIONS.map(option => (
              <Button
                key={option.id}
                size="lg"
                variant={soldTiming === option.id ? 'subtleTertiary' : 'outline'}
                onClick={() => handleTimingChange(option.id)}
                className="border-none shadow"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Quantity Slider */}
        <div className="px-8 py-4 flex-1 flex flex-col justify-center gap-4">
          <Typography variant="p" className="xs:text-lg">
            How many units did you sell?
          </Typography>
          <div className="bg-white rounded-2xl p-4">
            <InputSlider
              value={soldQuantity}
              onChange={handleQuantityChange}
              min={1}
              max={selectedBatch.current_quantity || 0}
              step={1}
              suffix={`/${selectedBatch.current_quantity}`}
              label={`Mark as sold: ${soldQuantity} units`}
            />
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="sticky bottom-0 bg-brand-white px-8 py-4 flex justify-between border-t border-muted gap-4">
        <Button size="lg" variant="subtleGray" onClick={onClose} className="rounded-full flex-1">
          Cancel
        </Button>
        <Button
          size="lg"
          variant="black"
          className="rounded-full flex-1"
          onClick={handleSoldAction}
          disabled={isMarkingSold || soldQuantity === 0}
        >
          {isMarkingSold ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Processing Sale...
            </span>
          ) : soldQuantity === (selectedBatch.current_quantity || 0) ? (
            'Sell all'
          ) : (
            `Sell ${soldQuantity}`
          )}
        </Button>
      </div>
    </div>
  )
}
