'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
import { useProductsForTrackingSetup } from '@/lib/queries/batch-tracking-onboarding'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { cn } from '@/lib/utils'
import type { AutomationRule } from '@/lib/queries/dashboard'

interface AutomationRulePanelProps {
  rule: AutomationRule | null
  isOpen: boolean
  isSaving?: boolean
  onClose: () => void
  onSave: (rule: AutomationRule, shelfLifeDays: number) => void
  onDelete: (rule: AutomationRule) => void
}

export function AutomationRulePanel({
  rule,
  isOpen,
  isSaving = false,
  onClose,
  onSave,
  onDelete,
}: AutomationRulePanelProps) {
  const storeId = useActiveStoreId() || ''

  // Fetch products for category rules; passing empty storeId skips the query for product rules
  const { data: categoryProducts = [] } = useProductsForTrackingSetup(
    rule?.type === 'category' && rule.rule_id ? storeId : '',
    { categoryId: rule?.rule_id ?? null, pageSize: 100 },
  )

  const [draftDays, setDraftDays] = useState(rule?.shelf_life_days ?? 14)

  useEffect(() => {
    if (isOpen && rule) {
      setDraftDays(rule.shelf_life_days ?? 14)
    }
  }, [isOpen, rule])

  const expiryExample = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + draftDays)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  }, [draftDays])

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 w-full sm:max-w-[500px]">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle className="text-xl font-bold">
            Edit {rule?.type === 'product' ? 'product' : 'category'} rule
          </SheetTitle>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          {/* Rule name (display only) */}
          {/* <div className="flex flex-col gap-1.5">
            <Typography variant="h5">Rule name</Typography>
            <Typography variant="p">{rule?.name}</Typography>
          </div> */}

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Typography variant="h5" className="font-semibold">
              Rule Type
            </Typography>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  rule?.type === 'product' ? 'bg-green-500' : 'bg-primary',
                )}
              />
              <Typography variant="p" color="muted">
                {rule?.type === 'product' ? 'Product' : 'Category'}
              </Typography>
            </div>
          </div>

          {/* Product or Category Name */}
          <div className="flex flex-col gap-1.5">
            <Typography variant="h5" className="font-semibold">
              {rule?.type === 'product' ? 'Product' : 'Category'}
            </Typography>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  rule?.type === 'product' ? 'bg-green-500' : 'bg-primary',
                )}
              />
              <Typography variant="p" color="muted">
                {rule?.name}
              </Typography>
            </div>
          </div>

          {/* Shelf life */}
          <div className="flex flex-col gap-2">
            <Typography variant="h5" className="font-semibold">
              Shelf life (days)
            </Typography>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={draftDays}
                onChange={e => setDraftDays(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
                className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <Typography variant="small" color="muted">
              Example: Delivered today → Expires {expiryExample}
            </Typography>
          </div>

          {/* Products covered */}
          <div className="flex flex-col gap-2">
            <Typography variant="h5" className="font-semibold">
              Products covered
            </Typography>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    rule?.type === 'product' ? 'bg-green-500' : 'bg-primary',
                  )}
                />
                <Typography variant="p" color="muted">
                  {rule?.products_count ?? 0}{' '}
                  {(rule?.products_count ?? 0) === 1 ? 'product' : 'products'}
                </Typography>
              </div>
              {rule?.type === 'product' ? (
                <Typography variant="small" color="muted" className="pl-4">
                  · {rule.name}
                </Typography>
              ) : (
                <>
                  {categoryProducts.slice(0, 10).map(p => (
                    <Typography key={p.product_id} variant="small" color="muted" className="pl-4">
                      · {p.name}
                    </Typography>
                  ))}
                  {categoryProducts.length > 10 && (
                    <Typography variant="small" color="muted" className="pl-4">
                      and {categoryProducts.length - 10} more
                    </Typography>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Info box */}

          <div className="flex flex-col gap-1">
            <Typography variant="p" className="font-semibold">
              These rules automatically add expiry dates to products.
            </Typography>
            <Typography variant="p" color="muted">
              When deliveries are logged, expiry dates will be calculated using this shelf life
              instead of manual entry.
            </Typography>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                disabled={isSaving}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Delete rule
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete rule?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{rule?.name}&rdquo; will be removed. Products in this {rule?.type} will no
                  longer have shelf life automatically assigned.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: 'destructive' })}
                  onClick={() => rule && onDelete(rule)}
                >
                  Delete rule
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button disabled={isSaving} onClick={() => rule && onSave(rule, draftDays)}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
