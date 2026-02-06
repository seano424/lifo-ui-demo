'use client'

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
import { Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface DeleteAccountDialogProps {
  onDelete: () => Promise<void>
  isDeleting?: boolean
}

export function DeleteAccountDialog({ onDelete, isDeleting = false }: DeleteAccountDialogProps) {
  const t = useTranslations('account.deleteAccount')
  const [isOpen, setIsOpen] = useState(false)

  const handleDelete = async () => {
    await onDelete()
    // Dialog will close after successful deletion
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full sm:w-auto">
          {t('button')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <Trash2 className="h-10 w-10 text-destructive" />
          </div>
          <AlertDialogTitle className="text-2xl">{t('title')}</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base">
            {t('description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full bg-destructive hover:bg-destructive/90 order-2 sm:order-2"
          >
            {isDeleting ? t('deleting') : t('confirm')}
          </AlertDialogAction>
          <AlertDialogCancel disabled={isDeleting} className="w-full order-1 sm:order-1 mt-0">
            {t('cancel')}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
