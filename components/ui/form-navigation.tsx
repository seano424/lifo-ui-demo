'use client'

import { Button } from '@/components/ui/button'

interface FormNavigationProps {
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  isSubmitting?: boolean
  isNextDisabled?: boolean
  showBack?: boolean
  nextType?: 'button' | 'submit'
}

/**
 * Reusable form navigation component for consistent button layout
 */
export function FormNavigation({
  onBack,
  onNext,
  nextLabel = 'Continue',
  isSubmitting = false,
  isNextDisabled = false,
  showBack = true,
  nextType = 'submit',
}: FormNavigationProps) {
  return (
    <div className="flex gap-3 pt-4">
      {showBack && onBack && (
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full"
          disabled={isSubmitting}
        >
          Back
        </Button>
      )}
      {onNext && (
        <Button
          type={nextType}
          onClick={nextType === 'button' ? onNext : undefined}
          className="w-full"
          disabled={isNextDisabled || isSubmitting}
        >
          {isSubmitting ? 'Processing...' : nextLabel}
        </Button>
      )}
    </div>
  )
}

/**
 * Navigation for confirmation steps with Back, Edit, and Confirm actions
 */
export function ConfirmNavigation({
  onBack,
  onEdit,
  onConfirm,
  isProcessing = false,
  isDisabled = false,
}: {
  onBack?: () => void
  onEdit?: () => void
  onConfirm?: () => void
  isProcessing?: boolean
  isDisabled?: boolean
}) {
  return (
    <div className="flex gap-3 pt-4">
      {onBack && (
        <Button variant="outline" onClick={onBack} className="w-full" disabled={isProcessing}>
          Back
        </Button>
      )}
      {onEdit && (
        <Button variant="outline" onClick={onEdit} className="w-full" disabled={isProcessing}>
          Edit
        </Button>
      )}
      {onConfirm && (
        <Button onClick={onConfirm} className="w-full" disabled={isDisabled || isProcessing}>
          {isProcessing ? 'Processing...' : isDisabled ? 'Verify First' : 'Create Account'}
        </Button>
      )}
    </div>
  )
}
