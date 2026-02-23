'use client'

import type { CategoryWithTrackingSettings } from '@/types/rpc-returns'
import { getShelfLifeColor } from './shared/shelf-life-color'
import { Badge } from '@/components/ui/badge'
import { PencilIcon, ZapIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Typography } from '@/components/ui/typography'

export interface CategoryState {
  mode: 'auto' | 'manual'
  days: number | null
}

const DEFAULT_SHELF_LIFE = 14

interface CategoryRowProps {
  category: CategoryWithTrackingSettings
  state: CategoryState
  onEdit: () => void
}

export function CategoryRow({ category, state, onEdit }: CategoryRowProps) {
  const effectiveDays = state.days ?? DEFAULT_SHELF_LIFE

  return (
    <button
      type="button"
      onClick={onEdit}
      className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-[14px] w-full text-left hover:bg-muted/40 transition-colors duration-100 cursor-pointer"
    >
      <Typography variant="p" className="font-medium truncate">
        {category.display_name_en}
      </Typography>
      <Typography variant="small" color="muted">
        {category.product_count} {category.product_count === 1 ? 'product' : 'products'}
      </Typography>

      {/* Mode badge */}
      {state.mode === 'auto' ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="primary">
              <ZapIcon className="size-3" />
              <span className="sr-only">Auto</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Automatically calculate shelf life</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="muted">
              <PencilIcon className="size-3" />
              <span className="sr-only">Manual</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Manually set shelf life</TooltipContent>
        </Tooltip>
      )}

      {/* Shelf life indicator */}
      {state.mode === 'auto' ? (
        <span
          className="text-[13px] font-medium tabular-nums text-right min-w-[60px] shrink-0"
          style={{ color: getShelfLifeColor(effectiveDays) }}
        >
          {effectiveDays} days
        </span>
      ) : (
        <span className="text-[13px] text-right min-w-[60px] shrink-0 text-muted-foreground">
          —
        </span>
      )}
    </button>
  )
}
