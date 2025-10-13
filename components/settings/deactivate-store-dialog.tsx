'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { useDeactivateStore } from '@/hooks/use-store-settings'
import type { StoreBasicInfo } from '@/lib/queries/store-settings'
import { logger } from '@/lib/utils/logger'

interface DeactivateStoreDialogProps {
  store: StoreBasicInfo
  canDeactivate: boolean
}

export function DeactivateStoreDialog({ store, canDeactivate }: DeactivateStoreDialogProps) {
  const [confirmText, setConfirmText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const { deactivateStore, isDeactivating } = useDeactivateStore()

  // Log if deactivation is disabled due to permissions
  useEffect(() => {
    if (!canDeactivate) {
      logger.warn('DeactivateStoreDialog', 'Deactivation disabled - user lacks permissions', {
        storeId: store.store_id,
        storeName: store.store_name,
      })
    }
  }, [canDeactivate, store.store_id, store.store_name])

  const isConfirmed = confirmText === store.store_name

  const handleDeactivate = () => {
    if (!isConfirmed) {
      logger.warn('DeactivateStoreDialog', 'Deactivation attempted without confirmation', {
        storeId: store.store_id,
        confirmText,
        expectedText: store.store_name,
      })
      return
    }

    logger.log('DeactivateStoreDialog', 'Starting store deactivation', {
      storeId: store.store_id,
      storeName: store.store_name,
    })

    deactivateStore()
    // Note: Dialog will remain open during deactivation
    // onSuccess handler in useDeactivateStore will navigate away
    // Only reset confirmText after successful deactivation
  }

  // Reset state when dialog closes naturally (not during deactivation)
  const handleOpenChange = (open: boolean) => {
    if (!open && !isDeactivating) {
      setConfirmText('')
    }
    setIsOpen(open)
  }

  const handleButtonClick = () => {
    logger.log('DeactivateStoreDialog', 'Opening deactivation dialog', {
      storeId: store.store_id,
      storeName: store.store_name,
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          disabled={!canDeactivate}
          className="w-full sm:w-auto"
          onClick={handleButtonClick}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Deactivate Store
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Deactivate Store
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action will deactivate &quot;{store.store_name}&quot; and cannot be easily undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-4 text-left text-sm text-muted-foreground">
          <div className="rounded-lg bg-destructive p-4 flex flex-col gap-2">
            <Typography className="text-white" variant="p">
              What will happen:
            </Typography>
            <div className="flex flex-col gap-1">
              <Typography className="text-white" variant="small">
                Store will be marked as inactive
              </Typography>
              <Typography className="text-white" variant="small">
                Employee accounts will be anonymized (GDPR compliance)
              </Typography>
              <Typography className="text-white" variant="small">
                All store users will lose access
              </Typography>
              <Typography className="text-white" variant="small">
                Inventory and batch data will be preserved
              </Typography>
              <Typography className="text-white" variant="small">
                You can contact support to reactivate if needed
              </Typography>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-store-name">
              Type <span className="font-mono font-bold">{store.store_name}</span> to confirm:
            </Label>
            <Input
              id="confirm-store-name"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={store.store_name}
              className="font-mono"
              disabled={isDeactivating}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeactivate}
            disabled={!isConfirmed || isDeactivating}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeactivating ? 'Deactivating...' : 'Deactivate Store'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
