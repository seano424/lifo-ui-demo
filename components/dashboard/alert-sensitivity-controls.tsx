'use client'

import { AlertTriangle, HelpCircle, RotateCcw, Settings, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Typography } from '@/components/ui/typography'
import { useScoringThresholds } from '@/hooks/use-scoring-thresholds'
import { useStorePermissions } from '@/hooks/use-store-settings'
import { useActiveStoreId } from '@/lib/stores/store-context'

interface AlertSensitivityControlsProps {
  storeId?: string
  className?: string
}

type AlertLevel = 'conservative' | 'balanced' | 'proactive'

// Convert threshold values to user-friendly alert levels
function thresholdToAlertLevel(warningThreshold: number): AlertLevel {
  if (warningThreshold >= 0.8) return 'conservative'
  if (warningThreshold >= 0.6) return 'balanced'
  return 'proactive'
}

// Convert alert level to threshold values
function alertLevelToThresholds(level: AlertLevel): {
  warning: number
  critical: number
} {
  switch (level) {
    case 'conservative':
      return { warning: 0.8, critical: 0.9 }
    case 'balanced':
      return { warning: 0.7, critical: 0.8 }
    case 'proactive':
      return { warning: 0.5, critical: 0.7 }
  }
}

export function AlertSensitivityControls({
  storeId: propStoreId,
  className,
}: AlertSensitivityControlsProps) {
  const t = useTranslations('alerts.sensitivity')

  const activeStoreId = useActiveStoreId()
  const storeId = propStoreId || activeStoreId || ''

  const [showAdvanced, setShowAdvanced] = useState(false)

  const { canEditAdvancedSettings } = useStorePermissions({ storeId })

  const { thresholds, isLoading, isUpdating, updateThresholds, resetToDefaults, isDefault } =
    useScoringThresholds(storeId)

  if (!storeId || !canEditAdvancedSettings) {
    return null
  }

  const currentAlertLevel = thresholdToAlertLevel(thresholds.warning)

  const handleAlertLevelChange = async (level: AlertLevel) => {
    const newThresholds = alertLevelToThresholds(level)
    try {
      await updateThresholds(newThresholds)
    } catch (error) {
      console.error('Failed to update alert sensitivity:', error)
    }
  }

  const handleReset = async () => {
    try {
      await resetToDefaults()
    } catch (error) {
      console.error('Failed to reset settings:', error)
    }
  }

  const getAlertDescription = (level: AlertLevel) => {
    switch (level) {
      case 'conservative':
        return t('descriptions.conservative')
      case 'balanced':
        return t('descriptions.balanced')
      case 'proactive':
        return t('descriptions.proactive')
    }
  }

  const getExpectedCount = (level: AlertLevel) => {
    switch (level) {
      case 'conservative':
        return t('expectedCounts.conservative')
      case 'balanced':
        return t('expectedCounts.balanced')
      case 'proactive':
        return t('expectedCounts.proactive')
    }
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <CardTitle>{t('title')}</CardTitle>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p>{t('helpText')}</p>
                <p className="mt-1">{t('helpTextLine2')}</p>
                <p>{t('helpTextLine3')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-2xl">
            <div className="flex items-center gap-3">
              {currentAlertLevel === 'conservative' && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-destructive rounded-full" />
                  <span className="">{t('levels.conservative')}</span>
                </div>
              )}
              {currentAlertLevel === 'balanced' && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded-full" />
                  <span className="">{t('levels.balanced')}</span>
                </div>
              )}
              {currentAlertLevel === 'proactive' && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary-500 rounded-full" />
                  <span className="">{t('levels.proactive')}</span>
                </div>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {getExpectedCount(currentAlertLevel)}
            </span>
          </div>

          {/* Alert Level Selection */}
          <div className="flex flex-col gap-4">
            <Label className="text-sm ">{t('currentPreference')}</Label>

            <Select
              value={currentAlertLevel}
              onValueChange={handleAlertLevelChange}
              disabled={isLoading || isUpdating}
            >
              <SelectTrigger className="w-full h-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">
                  <div className="space-y-1 flex flex-col gap-1 items-start p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-destructive rounded-full" />
                      <Typography variant="small">{t('levels.conservativeTitle')}</Typography>
                    </div>
                    <Typography variant="small">{t('selectDescriptions.conservative')}</Typography>
                  </div>
                </SelectItem>
                <SelectItem value="balanced">
                  <div className="space-y-1 flex flex-col gap-1 items-start p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <Typography variant="small">{t('levels.balancedTitle')}</Typography>
                    </div>
                    <Typography variant="muted" className="text-muted-foreground">
                      {t('selectDescriptions.balanced')}
                    </Typography>
                  </div>
                </SelectItem>
                <SelectItem value="proactive">
                  <div className="space-y-1 flex flex-col gap-1 items-start p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary-500 rounded-full" />
                      <Typography variant="small">{t('levels.proactiveTitle')}</Typography>
                    </div>
                    <Typography variant="muted" className="text-muted-foreground">
                      {t('selectDescriptions.proactive')}
                    </Typography>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground p-3 bg-blue-50 rounded-2xl border border-blue-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <p>{getAlertDescription(currentAlertLevel)}</p>
              </div>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch id="advanced-mode" checked={showAdvanced} onCheckedChange={setShowAdvanced} />
              <Label htmlFor="advanced-mode" className="text-sm">
                {t('technical.showDetails')}
              </Label>
            </div>
          </div>

          {/* Advanced Technical Details */}
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-2xl border border-dashed">
              <div className="text-sm space-y-3">
                <p className="">{t('technical.thresholds')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs  text-yellow-700">{t('technical.warningLevel')}</p>
                    <p className="text-lg font-mono">{thresholds.warning.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(thresholds.warning * 100)}% {t('technical.compositeScore')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs  text-destructive">{t('technical.criticalLevel')}</p>
                    <p className="text-lg font-mono">{thresholds.critical.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(thresholds.critical * 100)}% {t('technical.compositeScore')}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex flex-col gap-1">
                  <p className="text-xs ">{t('technical.howScoringWorks')}</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• {t('technical.expiryScore')}</li>
                    <li>• {t('technical.marginScore')}</li>
                    <li>• {t('technical.velocityScore')}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isLoading || isUpdating || isDefault}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {t('actions.resetToDefaults')}
            </Button>

            <div className="flex items-center gap-2">
              {isUpdating && (
                <span className="text-sm text-muted-foreground">{t('actions.saving')}</span>
              )}
              <div className="flex items-center gap-1">
                <Settings className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {t('actions.settingsSavedAuto')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
