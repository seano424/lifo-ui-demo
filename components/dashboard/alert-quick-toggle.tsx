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

type QuickLevel = 'urgent' | 'standard' | 'all'

// Convert threshold to quick level
function thresholdToQuickLevel(warningThreshold: number): QuickLevel {
  if (warningThreshold >= 0.8) return 'urgent'
  if (warningThreshold >= 0.6) return 'standard'
  return 'all'
}

// Convert quick level to threshold
function quickLevelToThreshold(level: QuickLevel): { warning: number; critical: number } {
  switch (level) {
    case 'urgent':
      return { warning: 0.8, critical: 0.9 }
    case 'standard':
      return { warning: 0.7, critical: 0.8 }
    case 'all':
      return { warning: 0.5, critical: 0.7 }
  }
}

export function AlertQuickToggle({ 
  storeId: propStoreId, 
  className,
  size = 'default'
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
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xs">Urgent</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Only show items requiring immediate action</p>
            <p className="text-xs text-muted-foreground">Items expiring today/tomorrow</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={size}
              variant={currentLevel === 'standard' ? 'default' : 'outline'}
              onClick={() => handleLevelChange('standard')}
              disabled={isUpdating}
              className="flex items-center gap-1 h-auto py-1 px-2"
            >
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span className="text-xs">Standard</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Items needing attention this week</p>
            <p className="text-xs text-muted-foreground">Recommended setting</p>
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
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs">Early</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Early warnings for all items</p>
            <p className="text-xs text-muted-foreground">Maximum prevention</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {isUpdating && (
        <div className="text-xs text-muted-foreground mt-1">
          Updating...
        </div>
      )}
    </TooltipProvider>
  )
}