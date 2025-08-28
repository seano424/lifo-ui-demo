'use client'

import { ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ScanningControlsProps {
  // Back button
  canGoBack?: boolean
  onGoBack?: () => void
  backButtonText?: string

  // Primary action button
  showPrimaryAction?: boolean
  onPrimaryAction?: () => void
  primaryActionText?: string
  primaryActionDisabled?: boolean
  primaryActionVariant?: 'default' | 'secondary' | 'outline' | 'destructive'

  // Secondary action button
  showSecondaryAction?: boolean
  onSecondaryAction?: () => void
  secondaryActionText?: string
  secondaryActionDisabled?: boolean
  secondaryActionVariant?: 'default' | 'secondary' | 'outline' | 'destructive'

  // Layout
  layout?: 'horizontal' | 'vertical'
  className?: string
}

export default function ScanningControls({
  canGoBack = false,
  onGoBack,
  backButtonText = 'Go Back',
  showPrimaryAction = false,
  onPrimaryAction,
  primaryActionText = 'Continue',
  primaryActionDisabled = false,
  primaryActionVariant = 'secondary',
  showSecondaryAction = false,
  onSecondaryAction,
  secondaryActionText = 'Cancel',
  secondaryActionDisabled = false,
  secondaryActionVariant = 'outline',
  layout = 'horizontal',
  className = '',
}: ScanningControlsProps) {
  const hasAnyControl = canGoBack || showPrimaryAction || showSecondaryAction

  if (!hasAnyControl) {
    return null
  }

  const containerClasses =
    layout === 'horizontal'
      ? 'flex flex-col sm:flex-row justify-center sm:gap-4'
      : 'flex flex-col gap-2'

  return (
    <div className={`${containerClasses} ${className}`}>
      {/* Back Button */}
      {canGoBack && onGoBack && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={onGoBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            {backButtonText}
          </Button>
        </div>
      )}

      {/* Action Buttons Container */}
      {(showPrimaryAction || showSecondaryAction) && (
        <div className="flex justify-center gap-2 pt-4">
          {/* Secondary Action Button */}
          {showSecondaryAction && onSecondaryAction && (
            <Button
              variant={secondaryActionVariant}
              onClick={onSecondaryAction}
              disabled={secondaryActionDisabled}
              className="flex items-center gap-2"
            >
              {secondaryActionText}
            </Button>
          )}

          {/* Primary Action Button */}
          {showPrimaryAction && onPrimaryAction && (
            <Button
              variant={primaryActionVariant}
              onClick={onPrimaryAction}
              disabled={primaryActionDisabled}
              className="flex items-center gap-2"
            >
              <Check className="w-6 h-6 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
              {primaryActionText}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
