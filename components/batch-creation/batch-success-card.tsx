'use client'

import { format } from 'date-fns'
import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ActivateDraftBatchResult } from '@/hooks/use-draft-batches'
import { cn } from '@/lib/utils'

interface BatchSuccessCardProps {
  result: ActivateDraftBatchResult
  onAddAnother?: () => void
  onSkip?: () => void
  className?: string
}

/**
 * Success card with checkmark animation showing batch activation result
 * Displays split batch information and next actions
 *
 * @example
 * ```tsx
 * <BatchSuccessCard
 *   result={activationResult}
 *   onAddAnother={() => setShowForm(true)}
 *   onSkip={() => goToNextProduct()}
 * />
 * ```
 */
export function BatchSuccessCard({
  result,
  onAddAnother,
  onSkip,
  className,
}: BatchSuccessCardProps) {
  const expiryDate = new Date(result.expiry_date)
  const formattedDate = format(expiryDate, 'MMM d, yyyy')

  return (
    <Card
      className={cn(
        'overflow-hidden border-2',
        result.success
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
        className,
      )}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Success/Error Icon with Animation */}
          <div className="flex items-center justify-center">
            {result.success ? (
              <div className="relative">
                <CheckCircle2
                  className={cn(
                    'h-16 w-16 text-green-600 dark:text-green-400',
                    'animate-in zoom-in-50 duration-300',
                  )}
                />
                {/* Pulse animation ring */}
                <div className="absolute inset-0 h-16 w-16 rounded-full bg-green-500/20 animate-ping" />
              </div>
            ) : (
              <AlertCircle className="h-16 w-16 text-red-600 dark:text-red-400 animate-in zoom-in-50 duration-300" />
            )}
          </div>

          {/* Success/Error Message */}
          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {result.success ? 'Batch Added!' : 'Failed to Add Batch'}
            </h3>
            <div className="text-base text-gray-700 dark:text-gray-300">
              <p className="font-semibold">
                {result.activated_quantity} units → {formattedDate}
              </p>
            </div>
          </div>

          {/* Split Batch Info */}
          {result.was_split && result.remaining_draft_quantity && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {result.remaining_draft_quantity} units still need expiry date
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    The batch was split. Continue to add expiry date for the remaining units.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Message */}
          {result.message && !result.was_split && (
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">{result.message}</p>
          )}

          {/* Action Buttons */}
          {result.success && (onAddAnother || onSkip) && (
            <div className="pt-2 space-y-2">
              {/* Add Another Button - Primary action */}
              {onAddAnother && (
                <Button
                  type="button"
                  variant="default"
                  size="lg"
                  onClick={onAddAnother}
                  className={cn(
                    'w-full min-h-[44px]',
                    'font-semibold',
                    result.was_split && 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700',
                  )}
                >
                  {result.was_split ? 'Add Expiry for Remaining Units' : 'Add Another Batch'}
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              )}

              {/* Skip Button - Secondary action */}
              {onSkip && !result.was_split && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={onSkip}
                  className="w-full min-h-[44px] font-medium"
                >
                  Skip to Next Product
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
