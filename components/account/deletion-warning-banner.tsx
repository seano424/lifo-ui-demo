'use client'

import { usePendingDeletion, useCancelDeletion } from '@/hooks/use-delete-account'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { Typography } from '@/components/ui/typography'

export function DeletionWarningBanner() {
  const t = useTranslations('account.deletionWarning')
  const { data: pendingDeletion } = usePendingDeletion()
  const { mutate: cancelDeletion, isPending } = useCancelDeletion()

  if (!pendingDeletion) return null

  const plural = pendingDeletion.daysRemaining !== 1 ? 's' : ''

  return (
    <div className="px-4 py-3 mb-4 bg-primary-900 dark:bg-linear-to-br from-secondary-900 via-primary-900 to-primary-900">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {/* <AlertTriangle className="shrink-0" /> */}
          <Typography variant="small" className="font-bold text-white">
            {t('message', {
              date: pendingDeletion.scheduledFor.toLocaleDateString(),
              days: pendingDeletion.daysRemaining,
              plural: plural,
            })}
          </Typography>
        </div>
        <Button
          size="xs"
          onClick={() => cancelDeletion()}
          disabled={isPending}
          className="shrink-0 border-none rounded-full font-semibold bg-white hover:bg-white/90 text-purple-700 dark:bg-black dark:text-white dark:hover:bg-black/90"
          aria-label={t('cancelAriaLabel')}
        >
          {isPending ? t('cancellingButton') : t('cancelButton')}
        </Button>
      </div>
    </div>
  )
}
