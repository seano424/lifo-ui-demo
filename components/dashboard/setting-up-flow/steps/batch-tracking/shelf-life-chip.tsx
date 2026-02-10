'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Type, ZapIcon } from 'lucide-react'

interface ShelfLifeChipProps {
  mode: 'auto' | 'manual'
  days: number | null
  onModeChange: (mode: 'auto' | 'manual') => void
  onDaysChange: (days: number | null) => void
  className?: string
}

const DEFAULT_SHELF_LIFE = 14

/**
 * Shelf Life Chip Component
 *
 * Shows both auto and manual options as a segmented control.
 * - Auto mode: Shows days with click-to-edit inline input (selected state)
 * - Manual mode: Shows "Manual entry" (selected state)
 * - Both options are always visible with clear selected/unselected states
 */
export function ShelfLifeChip({
  mode,
  days,
  onModeChange,
  onDaysChange,
  className,
}: ShelfLifeChipProps) {
  const [editing, setEditing] = useState(false)
  const [tempDays, setTempDays] = useState(days?.toString() || '')

  const commitDays = () => {
    const parsed = parseInt(tempDays, 10)
    onDaysChange(parsed || DEFAULT_SHELF_LIFE)
    setEditing(false)
  }

  const handleAutoClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (mode !== 'auto') {
      onModeChange('auto')
    } else {
      // Already in auto mode, start editing the days
      setTempDays(days?.toString() || DEFAULT_SHELF_LIFE.toString())
      setEditing(true)
    }
  }

  const handleManualClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (mode !== 'manual') {
      onModeChange('manual')
    }
  }

  // Editing state: show inline input in place of auto button
  if (editing) {
    return (
      <div
        className={cn('inline-flex items-center gap-1', className)}
        onClick={e => e.stopPropagation()}
      >
        <div className="items-center rounded-lg border border-muted bg-white overflow-hidden grid grid-cols-2">
          <div className="px-3 py-3 bg-secondary-50 border-r border-muted">
            <input
              type="number"
              min="1"
              value={tempDays}
              onChange={e => setTempDays(e.target.value)}
              onBlur={commitDays}
              onKeyDown={e => {
                if (e.key === 'Enter') commitDays()
                if (e.key === 'Escape') {
                  setTempDays(days?.toString() || '')
                  setEditing(false)
                }
              }}
              className="w-16 text-sm text-center bg-transparent border-none text-secondary-900 focus:outline-none focus:ring-0"
            />
          </div>
          <button
            type="button"
            onClick={handleManualClick}
            className="inline-flex items-center gap-1.5 px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Type className="w-3 h-3" />
            Manual
          </button>
        </div>
      </div>
    )
  }

  // Display state: show segmented control with both options
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <div className="border border-muted items-center rounded-lg overflow-hidden grid grid-cols-2 flex-1">
        {/* Auto button */}
        <button
          type="button"
          onClick={handleAutoClick}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors border-r border-muted',
            mode === 'auto'
              ? 'bg-secondary-50 text-secondary-700'
              : 'bg-white text-gray-600 hover:bg-gray-50',
          )}
        >
          <ZapIcon className="w-3 h-3" />
          {days ?? DEFAULT_SHELF_LIFE}d
        </button>

        {/* Manual button */}
        <button
          type="button"
          onClick={handleManualClick}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors',
            mode === 'manual'
              ? 'bg-secondary-50 text-secondary-700'
              : 'bg-white text-gray-600 hover:bg-gray-50',
          )}
        >
          <Type className="w-3 h-3" />
          Manual
        </button>
      </div>
    </div>
  )
}
