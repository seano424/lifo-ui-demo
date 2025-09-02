'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useScoringThresholds } from '@/hooks/use-scoring-thresholds'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface AlertQuickToggleProps {
  storeId?: string
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

type QuickLevel = 'urgent' | 'default' | 'all'

// Convert threshold to quick level
function thresholdToQuickLevel(warningThreshold: number): QuickLevel {
  if (warningThreshold >= 0.8) return 'urgent'
  if (warningThreshold >= 0.6) return 'default'
  return 'all' // This covers 0.5 and below
}

// Convert quick level to threshold
function quickLevelToThreshold(level: QuickLevel): {
  warning: number
  critical: number
} {
  switch (level) {
    case 'urgent':
      return { warning: 0.8, critical: 0.9 } // Fewest items (2)
    case 'default':
      return { warning: 0.7, critical: 0.8 } // Medium items (3)
    case 'all':
      return { warning: 0.3, critical: 0.5 } // Most items (early warnings)
  }
}

export function AlertQuickToggle({
  storeId: propStoreId,
  className,
  size = 'default',
}: AlertQuickToggleProps) {
  const activeStoreId = useActiveStoreId()
  const storeId = propStoreId || activeStoreId || ''

  const [isUpdating, setIsUpdating] = useState(false)

  const { thresholds, updateThresholds } = useScoringThresholds(storeId)

  if (!storeId) {
    return null
  }

  const currentLevel = thresholdToQuickLevel(thresholds.warning)

  const handleLevelChange = async (level: QuickLevel) => {
    if (!level || level === currentLevel) return

    setIsUpdating(true)
    try {
      const newThresholds = quickLevelToThreshold(level)
      await updateThresholds(newThresholds)
    } catch (error) {
      console.error('Failed to update alert level:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <TooltipProvider>
      <div className={`flex gap-1 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={size}
              variant={currentLevel === 'urgent' ? 'default' : 'outline'}
              onClick={() => handleLevelChange('urgent')}
              disabled={isUpdating}
              className="flex items-center gap-1 h-auto py-1 px-2"
            >
              <span className="text-xs">Urgent</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Only urgent items requiring immediate action</p>
            <p className="text-xs">Fewest alerts - most restrictive</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={size}
              variant={currentLevel === 'default' ? 'default' : 'outline'}
              onClick={() => handleLevelChange('default')}
              disabled={isUpdating}
              className="flex items-center gap-1 h-auto py-1 px-2"
            >
              <span className="text-xs">Default</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Items needing attention soon</p>
            <p className="text-xs">Balanced view - recommended</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={size}
              variant={currentLevel === 'all' ? 'default' : 'outline'}
              onClick={() => handleLevelChange('all')}
              disabled={isUpdating}
              className="flex items-center gap-1 h-auto py-1 px-2"
            >
              <span className="text-xs">Early</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>All flagged items and early warnings</p>
            <p className="text-xs">Most alerts - maximum prevention</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
