'use client'

import { format } from 'date-fns'
import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ActivateDraftBatchResult } from '@/hooks/use-draft-batches'
import { cn } from '@/lib/utils'
import { parseISODateAsLocal } from '@/lib/utils/date-conversion'
import { Typography } from '@/components/ui/typography'

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
  const expiryDate = result.expiry_date ? parseISODateAsLocal(result.expiry_date) : null
  const formattedDate = expiryDate ? format(expiryDate, 'MMM d, yyyy') : 'N/A'

  return (
    <Card
      className={cn(
        'overflow-hidden border-2',
        result.success
          ? 'border-primary/20 dark:border-primary-800'
          : 'border-destructive dark:border-destructive',
        className,
      )}
    >
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          {/* Success/Error Icon with Animation */}
          <div className="flex items-center justify-center">
            {result.success ? (
              <div className="relative">
                <CheckCircle2
                  className={cn('h-16 w-16', 'text-primary', 'animate-in zoom-in-50 duration-300')}
                />
                {/* Pulse animation ring */}
                <div className="absolute inset-0 h-16 w-16 rounded-full bg-primary/20 animate-ping" />
              </div>
            ) : (
              <AlertCircle className="h-16 w-16 text-primary animate-in zoom-in-50 duration-300" />
            )}
          </div>

          {/* Success/Error Message */}
          <div className="text-center flex flex-col gap-4">
            <Typography variant="h3" color="primary">
              {result.success ? 'Batch Added!' : 'Failed to Add Batch'}
            </Typography>
            <Typography variant="p" color="primary">
              {result.activated_quantity} units → {formattedDate}
            </Typography>
          </div>

          {/* Split Batch Info */}
          {result.was_split && result.remaining_draft_quantity && (
            <div className="p-3 rounded-lg bg-secondary-50 border border-secondary-200 dark:bg-secondary-900/20 dark:border-secondary-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-secondary-600 dark:text-secondary-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                    {result.remaining_draft_quantity} units still need expiry date
                  </p>
                  <p className="text-xs text-secondary-700 dark:text-secondary-300 mt-1">
                    The batch was split. Continue to add expiry date for the remaining units.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Message */}
          {result.message && !result.was_split && (
            <Typography className="text-center" variant="p">
              {result.message}
            </Typography>
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
                    result.was_split &&
                      'bg-secondary-600 hover:bg-secondary-700 dark:bg-secondary-700',
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
