'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('dashboard.redesign.automations')
  const storeId = useActiveStoreId() || ''

  // Fetch products for category rules; passing empty storeId skips the query for product rules
  const { data: categoryProducts = [] } = useProductsForTrackingSetup(
    rule?.type === 'category' && rule.rule_id ? storeId : '',
    { categoryId: rule?.rule_id ?? null, pageSize: 100 },
  )

  const [draftDays, setDraftDays] = useState(rule?.shelf_life_days ?? 14)
  const [daysInput, setDaysInput] = useState(String(rule?.shelf_life_days ?? 14))

  useEffect(() => {
    if (isOpen && rule) {
      const days = rule.shelf_life_days ?? 14
      setDraftDays(days)
      setDaysInput(String(days))
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
            {t('panel.editTypeTitle', {
              type: rule?.type === 'product' ? t('panel.typeProduct') : t('panel.typeCategory'),
            })}
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
              {t('panel.ruleTypeDisplayHeading')}
            </Typography>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  rule?.type === 'product' ? 'bg-green-500' : 'bg-primary',
                )}
              />
              <Typography variant="p" color="muted">
                {rule?.type === 'product' ? t('panel.typeProduct') : t('panel.typeCategory')}
              </Typography>
            </div>
          </div>

          {/* Product or Category Name */}
          <div className="flex flex-col gap-1.5">
            <Typography variant="h5" className="font-semibold">
              {rule?.type === 'product' ? t('panel.typeProduct') : t('panel.typeCategory')}
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Typography variant="h5" className="font-semibold">
                {t('panel.shelfLifeHeading')}
              </Typography>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={daysInput}
                  onChange={e => setDaysInput(e.target.value)}
                  onBlur={() => {
                    const parsed = Math.max(1, Number.parseInt(daysInput, 10) || 1)
                    setDraftDays(parsed)
                    setDaysInput(String(parsed))
                  }}
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-24 text-center"
                />
              </div>
            </div>
            <Typography variant="small" color="muted">
              {t('panel.shelfLifeExample', { date: expiryExample })}
            </Typography>
          </div>

          {/* Products covered */}
          <div className="flex flex-col gap-2">
            <Typography variant="h5" className="font-semibold">
              {t('panel.productsCoveredHeading')}
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
                  {t('panel.productCount', { count: rule?.products_count ?? 0 })}
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
                      {t('panel.andMore', { count: categoryProducts.length - 10 })}
                    </Typography>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Info box */}

          <div className="flex flex-col gap-1">
            <Typography variant="p" className="font-semibold">
              {t('panel.infoTitle')}
            </Typography>
            <Typography variant="p" color="muted">
              {t('panel.infoDescription')}
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
                {t('actions.deleteRule')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteDialog.description', {
                    name: rule?.name ?? '',
                    type: rule?.type ?? '',
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: 'destructive' })}
                  onClick={() => rule && onDelete(rule)}
                >
                  {t('deleteDialog.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              {t('actions.cancel')}
            </Button>
            <Button disabled={isSaving} onClick={() => rule && onSave(rule, draftDays)}>
              {isSaving ? t('actions.saving') : t('actions.saveChanges')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
