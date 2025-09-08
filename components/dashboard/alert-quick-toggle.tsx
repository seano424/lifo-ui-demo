'use client'

import { useTranslations } from 'next-intl'
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

type QuickLevel = 'critical' | 'high' | 'medium' | 'low'

// Convert legacy threshold to urgency level (for backward compatibility)
function thresholdToUrgencyLevel(warningThreshold: number): QuickLevel {
  if (warningThreshold >= 0.8) return 'critical'
  if (warningThreshold >= 0.6) return 'high'
  if (warningThreshold >= 0.4) return 'medium'
  return 'low'
}

export function AlertQuickToggle({
  storeId: propStoreId,
  className,
  size = 'default',
}: AlertQuickToggleProps) {
  const t = useTranslations('storeInsights.alertQuickToggle')
  const activeStoreId = useActiveStoreId()
  const storeId = propStoreId || activeStoreId || ''

  const [isUpdating, setIsUpdating] = useState(false)

  const { thresholds, updateThresholds } = useScoringThresholds(storeId)

  if (!storeId) {
    return null
  }

  const currentLevel = thresholdToUrgencyLevel(thresholds.warning)

  const handleLevelChange = async (level: QuickLevel) => {
    if (!level || level === currentLevel) return

    setIsUpdating(true)
    try {
      // Simple mapping: urgency level -> threshold for storage
      const thresholdMap = {
        critical: 0.8,
        high: 0.6,
        medium: 0.4,
        low: 0.2,
      }

      const threshold = thresholdMap[level]
      await updateThresholds({
        warning: threshold,
        critical: Math.min(threshold + 0.1, 1.0),
      })
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
              variant={currentLevel === 'critical' ? 'default' : 'outline'}
              onClick={() => handleLevelChange('critical')}
              disabled={isUpdating}
              className="flex items-center gap-1 h-auto py-1 px-2"
            >
              <span className="text-xs">{t('levels.critical')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('tooltips.critical')}</p>
            <p className="text-xs">{t('tooltips.criticalDesc')}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={size}
              variant={currentLevel === 'high' ? 'default' : 'outline'}
              onClick={() => handleLevelChange('high')}
              disabled={isUpdating}
              className="flex items-center gap-1 h-auto py-1 px-2"
            >
              <span className="text-xs">{t('levels.high')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('tooltips.high')}</p>
            <p className="text-xs">{t('tooltips.highDesc')}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={size}
              variant={currentLevel === 'medium' ? 'default' : 'outline'}
              onClick={() => handleLevelChange('medium')}
              disabled={isUpdating}
              className="flex items-center gap-1 h-auto py-1 px-2"
            >
              <span className="text-xs">{t('levels.medium')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('tooltips.medium')}</p>
            <p className="text-xs">{t('tooltips.mediumDesc')}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={size}
              variant={currentLevel === 'low' ? 'default' : 'outline'}
              onClick={() => handleLevelChange('low')}
              disabled={isUpdating}
              className="flex items-center gap-1 h-auto py-1 px-2"
            >
              <span className="text-xs">{t('levels.all')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('tooltips.all')}</p>
            <p className="text-xs">{t('tooltips.allDesc')}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
