'use client'

import type { ProductWithTrackingSettings } from '@/types/rpc-returns'
import { getShelfLifeColor } from './shared/shelf-life-color'

const DEFAULT_SHELF_LIFE = 14

export interface ProductState {
  mode: 'auto' | 'manual'
  days: number | null
}

interface ProductRowProps {
  product: ProductWithTrackingSettings
  override: ProductState | null
  onEdit: () => void
}

export function ProductRow({ product, override, onEdit }: ProductRowProps) {
  const hasOverride = override !== null

  const displayMode = override?.mode ?? (product.inherited_auto_create ? 'auto' : 'manual')
  const displayDays =
    override?.days !== undefined ? override.days : product.inherited_shelf_life_days
  const effectiveDays = displayDays ?? DEFAULT_SHELF_LIFE

  return (
    <button
      type="button"
      onClick={onEdit}
      className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-[14px] w-full text-left hover:bg-muted/40 transition-colors duration-100 cursor-pointer"
    >
      {/* Product info */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className="font-medium text-[14px] truncate"
          style={{ color: 'var(--ob-text-primary)' }}
        >
          {product.name}
        </span>
        <span className="text-[12px]" style={{ color: 'var(--ob-text-muted)' }}>
          {product.category_name ?? 'Uncategorized'}
          {hasOverride && (
            <span className="ml-2 text-secondary-700 font-medium">· Custom override</span>
          )}
          {!hasOverride && <span className="ml-2">· Inherits category settings</span>}
        </span>
      </div>

      {/* Mode badge */}
      {displayMode === 'auto' ? (
        <span className="inline-flex items-center gap-[5px] px-3 py-[5px] rounded-full text-[12px] font-medium bg-secondary/10 text-secondary-900 shrink-0">
          ⚡ Auto
        </span>
      ) : (
        <span className="inline-flex items-center gap-[5px] px-3 py-[5px] rounded-full text-[12px] font-medium bg-[#dbeafe] text-[#2563eb] shrink-0">
          ✏️ Manual
        </span>
      )}

      {/* Shelf life indicator */}
      {displayMode === 'auto' ? (
        <span
          className="text-[13px] font-medium tabular-nums text-right min-w-[60px] shrink-0"
          style={{ color: getShelfLifeColor(effectiveDays) }}
        >
          {effectiveDays} days
        </span>
      ) : (
        <span
          className="text-[13px] text-right min-w-[60px] shrink-0"
          style={{ color: 'var(--ob-text-muted)' }}
        >
          —
        </span>
      )}
    </button>
  )
}
