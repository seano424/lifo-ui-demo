'use client'

import { usePendingDeletion, useCancelDeletion } from '@/hooks/use-delete-account'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function DeletionWarningBanner() {
  const t = useTranslations('account.deletionWarning')
  const { data: pendingDeletion } = usePendingDeletion()
  const { mutate: cancelDeletion, isPending } = useCancelDeletion()

  if (!pendingDeletion) return null

  const plural = pendingDeletion.daysRemaining !== 1 ? 's' : ''

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            {t('message', {
              date: pendingDeletion.scheduledFor.toLocaleDateString(),
              days: pendingDeletion.daysRemaining,
              plural: plural,
            })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => cancelDeletion()}
          disabled={isPending}
          className="shrink-0"
          aria-label={t('cancelAriaLabel')}
        >
          {isPending ? t('cancellingButton') : t('cancelButton')}
        </Button>
      </div>
    </div>
  )
}
