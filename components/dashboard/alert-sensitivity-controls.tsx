'use client'

import {
  AlertTriangle,
  HelpCircle,
  RotateCcw,
  Settings,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'

import { Typography } from '@/components/ui/typography'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  const activeStoreId = useActiveStoreId()
  const storeId = propStoreId || activeStoreId || ''

  const [showAdvanced, setShowAdvanced] = useState(false)

  const { canEditAdvancedSettings } = useStorePermissions({ storeId })

  const {
    thresholds,
    isLoading,
    isUpdating,
    updateThresholds,
    resetToDefaults,
    isDefault,
  } = useScoringThresholds(storeId)

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
        return 'Only show critical items requiring immediate action'
      case 'balanced':
        return 'Show items needing attention soon (recommended)'
      case 'proactive':
        return 'Early warnings for all items that might need attention'
    }
  }

  const getExpectedCount = (level: AlertLevel) => {
    switch (level) {
      case 'conservative':
        return 'Fewer alerts, higher urgency'
      case 'balanced':
        return 'Moderate alerts, good balance'
      case 'proactive':
        return 'More alerts, early prevention'
    }
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <CardTitle>Alert Sensitivity</CardTitle>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent
                side="left"
                className="max-w-xs"
              >
                <p>Control when items appear in your alerts and dashboard.</p>
                <p className="mt-1">Higher sensitivity = more early warnings</p>
                <p>Lower sensitivity = only critical items</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <CardDescription>
            How sensitive should alerts be to potential waste?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {currentAlertLevel === 'conservative' && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="font-medium">Conservative</span>
                </div>
              )}
              {currentAlertLevel === 'balanced' && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <span className="font-medium">Balanced</span>
                </div>
              )}
              {currentAlertLevel === 'proactive' && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="font-medium">Proactive</span>
                </div>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {getExpectedCount(currentAlertLevel)}
            </span>
          </div>

          {/* Alert Level Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">
              Choose your alert preference
            </Label>

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
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <Typography variant="small">
                        Conservative - Critical Only
                      </Typography>
                    </div>
                    <Typography variant="small">
                      Items expiring today/tomorrow or with high waste risk
                    </Typography>
                  </div>
                </SelectItem>
                <SelectItem value="balanced">
                  <div className="space-y-1 flex flex-col gap-1 items-start p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      <Typography variant="small">
                        Balanced - Action Needed (Recommended)
                      </Typography>
                    </div>
                    <Typography
                      variant="muted"
                      className="text-muted-foreground"
                    >
                      Items needing attention this week
                    </Typography>
                  </div>
                </SelectItem>
                <SelectItem value="proactive">
                  <div className="space-y-1 flex flex-col gap-1 items-start p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <Typography variant="small">
                        Proactive - Early Warnings
                      </Typography>
                    </div>
                    <Typography
                      variant="muted"
                      className="text-muted-foreground"
                    >
                      All items that might need attention soon
                    </Typography>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p>{getAlertDescription(currentAlertLevel)}</p>
              </div>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="advanced-mode"
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
              />
              <Label
                htmlFor="advanced-mode"
                className="text-sm"
              >
                Show technical details
              </Label>
            </div>
          </div>

          {/* Advanced Technical Details */}
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-dashed">
              <div className="text-sm space-y-3">
                <p className="font-medium">Technical Thresholds:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-yellow-700">
                      Warning Level
                    </p>
                    <p className="text-lg font-mono">
                      {thresholds.warning.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(thresholds.warning * 100)}% composite score
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-red-700">
                      Critical Level
                    </p>
                    <p className="text-lg font-mono">
                      {thresholds.critical.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(thresholds.critical * 100)}% composite score
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs font-medium">How scoring works:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>
                      • <strong>Expiry Score:</strong> How close to expiration
                      date
                    </li>
                    <li>
                      • <strong>Margin Score:</strong> Profit margin at risk
                    </li>
                    <li>
                      • <strong>Velocity Score:</strong> How fast the item
                      usually sells
                    </li>
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
              Reset to Defaults
            </Button>

            <div className="flex items-center gap-2">
              {isUpdating && (
                <span className="text-sm text-muted-foreground">Saving...</span>
              )}
              <div className="flex items-center gap-1">
                <Settings className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Settings saved automatically
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
