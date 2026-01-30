/**
 * Disconnect Square Dialog Component
 * Confirmation dialog for disconnecting Square integration
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AlertTriangle, Unplug } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useDisconnectSquare } from '@/hooks/use-square-integration'

interface DisconnectSquareDialogProps {
  connectionId: string | undefined
  trigger?: React.ReactNode
}

export function DisconnectSquareDialog({ connectionId, trigger }: DisconnectSquareDialogProps) {
  const router = useRouter()
  const t = useTranslations('integrations.square.disconnect')
  const [open, setOpen] = useState(false)

  const disconnectMutation = useDisconnectSquare()

  const handleDisconnect = async () => {
    if (!connectionId) {
      return
    }

    try {
      await disconnectMutation.mutateAsync({ connectionId })
      setOpen(false)

      // Redirect to integrations page after disconnect
      setTimeout(() => {
        router.push('/dashboard/integrations')
      }, 1000)
    } catch (error: unknown) {
      // Error is handled by the mutation hook (toast notification)
      console.error('Disconnect failed:', error)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="destructive">
            <Unplug className="h-4 w-4" />
            {t('disconnect')}
          </Button>
        )}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          </div>
          <div className="flex flex-col gap-2 text-left">
            <AlertDialogDescription>{t('description')}</AlertDialogDescription>
            <div className="rounded-lg bg-amber-50 p-3 text-sm">
              <p className=" text-amber-900">{t('warning')}</p>
              <ul className="mt-2 list-disc flex flex-col gap-1 pl-4 text-amber-800">
                <li>{t('warningSync')}</li>
                <li>{t('warningReconnect')}</li>
                <li>{t('warningData')}</li>
              </ul>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={disconnectMutation.isPending}>
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={e => {
              e.preventDefault()
              handleDisconnect()
            }}
            disabled={disconnectMutation.isPending}
            className="bg-destructive hover:bg-destructive"
          >
            {disconnectMutation.isPending ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t('disconnecting')}
              </>
            ) : (
              <>
                <Unplug className="mr-2 h-4 w-4" />
                {t('confirm')}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
