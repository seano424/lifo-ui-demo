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
 * Shows shelf life mode and days with inline editing.
 * - Auto mode: Shows days with click-to-edit inline input
 * - Manual mode: Shows "Manual entry" button
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

  const handleModeToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newMode = mode === 'auto' ? 'manual' : 'auto'
    onModeChange(newMode)
  }

  // Manual mode: show "Manual entry" button
  if (mode === 'manual') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <button
          type="button"
          onClick={handleModeToggle}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs font-medium text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
        >
          <Type className="w-3 h-3" />
          Manual entry
        </button>
      </div>
    )
  }

  // Auto mode - editing state: show inline input
  if (editing) {
    return (
      <div
        className={cn('inline-flex items-center gap-1.5', className)}
        onClick={e => e.stopPropagation()}
      >
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
          className="w-20 text-sm text-center px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
        />
      </div>
    )
  }

  // Auto mode - display state: show days button
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={e => {
          e.stopPropagation()
          setTempDays(days?.toString() || DEFAULT_SHELF_LIFE.toString())
          setEditing(true)
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors group bg-gray-100 text-gray-700 hover:bg-gray-200"
      >
        {days ?? DEFAULT_SHELF_LIFE}d
        <ZapIcon className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition-colors" />
      </button>
    </div>
  )
}
